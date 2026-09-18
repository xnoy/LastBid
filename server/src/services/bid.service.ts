import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { keys } from '../lib/redis';
import { consumeRateLimit, runPlaceBid, type BidScriptResult, type BidSuccess } from '../redis/scripts';
import { emitToAuction, emitToUser } from '../realtime/bus';
import { hydrate } from './auctionState.service';
import { bidderAlias } from './privacy';
import { notify } from './notification.service';
import { formatINR } from '../shared/money';

/** Error codes the Lua script can return, mapped to something a human reads. */
export const BID_ERROR_MESSAGES: Record<string, string> = {
  AUCTION_NOT_LOADED: 'That auction no longer exists.',
  AUCTION_NOT_ACTIVE: 'Bidding is closed on this auction.',
  AUCTION_ENDED: 'The clock ran out. This auction has ended.',
  SELLER_CANNOT_BID: 'You cannot bid on your own listing.',
  INVALID_AMOUNT: 'Enter a whole rupee amount.',
  BID_TOO_LOW: 'Someone got there first. Raise your bid to at least the amount shown.',
  STALE_BID: 'The price moved while you were bidding. Check the new price and try again.',
  MAX_NOT_INCREASED: 'Your maximum is already at or above that amount.',
  RATE_LIMITED: 'You are bidding very quickly. Wait a moment and try again.',
};

export interface PlaceBidInput {
  auctionId: string;
  userId: string;
  /** The bidder's ceiling in paise. For a one-shot bid this equals the bid. */
  maxAmount: number;
  /** Client's idempotency token; a repeat returns the first result. */
  requestId?: string;
  /** Price the client believed was current. Used only to detect stale taps. */
  declaredCurrentBid?: number;
  /** True when the user opted into proxy bidding rather than a single bid. */
  isProxy: boolean;
}

export interface PlaceBidOutcome {
  ok: boolean;
  code: string;
  message?: string;
  price?: number;
  minNextBid?: number;
  endsAt?: number;
  version?: number;
  youAreWinning?: boolean;
  retryAfterMs?: number;
}

/**
 * The full bid pipeline.
 *
 *   1. per-user rate limit (Redis, atomic)
 *   2. atomic validate-and-apply in Lua — the only place price is decided
 *   3. durable projection into Postgres
 *   4. broadcast to the auction room + private nudges to the people affected
 *
 * Steps 3 and 4 can never change the outcome of step 2; if the process dies
 * between them, `reconcile()` below repairs the projection from Redis.
 */
export async function placeBid(input: PlaceBidInput): Promise<PlaceBidOutcome> {
  const limit = await consumeRateLimit(
    keys.rateLimit(input.userId),
    env.BID_RATE_LIMIT_POINTS,
    env.BID_RATE_LIMIT_WINDOW_SECONDS * 1000,
    `${Date.now()}:${Math.random().toString(36).slice(2)}`,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: BID_ERROR_MESSAGES.RATE_LIMITED,
      retryAfterMs: limit.retryAfterMs,
    };
  }

  const args = {
    auctionId: input.auctionId,
    userId: input.userId,
    maxAmount: input.maxAmount,
    requestId: input.requestId,
    declaredCurrentBid: input.declaredCurrentBid,
    snipeWindowMs: env.ANTI_SNIPE_WINDOW_SECONDS * 1000,
    snipeExtensionMs: env.ANTI_SNIPE_EXTENSION_SECONDS * 1000,
  };

  let result: BidScriptResult = await runPlaceBid(args);

  // Cold key: pull the auction into Redis and retry exactly once.
  if (!result.ok && result.code === 'AUCTION_NOT_LOADED') {
    const hydrated = await hydrate(input.auctionId);
    if (!hydrated) {
      return { ok: false, code: 'AUCTION_NOT_LOADED', message: BID_ERROR_MESSAGES.AUCTION_NOT_LOADED };
    }
    result = await runPlaceBid(args);
  }

  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: BID_ERROR_MESSAGES[result.code] ?? 'That bid could not be accepted.',
      price: result.price,
      minNextBid: result.minNextBid,
      version: result.version,
    };
  }

  await persist(input, result);
  await broadcast(input, result);

  return {
    ok: true,
    code: 'OK',
    price: result.price,
    minNextBid: result.minNextBid,
    endsAt: result.endsAt,
    version: result.version,
    youAreWinning: result.leaderId === input.userId,
  };
}

/**
 * Project the accepted bid into Postgres.
 * The auction row is updated with a guard (`currentBid < newPrice`) so that if
 * two writes arrive out of order the older one cannot walk the price backwards.
 */
async function persist(input: PlaceBidInput, result: BidSuccess): Promise<void> {
  const { auctionId } = input;

  await prisma.$transaction(async (tx) => {
    for (const [index, event] of result.events.entries()) {
      await tx.bid.create({
        data: {
          auctionId,
          bidderId: event.userId,
          amount: event.amount,
          isAuto: event.isAuto,
          // Only the originating bid carries the idempotency token; the proxy
          // counter-bid it triggers gets a derived one so the unique index holds.
          requestId: input.requestId ? `${input.requestId}:${index}` : null,
        },
      });
    }

    await tx.auction.updateMany({
      where: { id: auctionId, currentBid: { lt: result.price } },
      data: {
        currentBid: result.price,
        bidCount: result.bidCount,
        endsAt: new Date(result.endsAt),
        winnerId: result.leaderId || null,
      },
    });

    if (input.isProxy) {
      await tx.autoBid.upsert({
        where: { auctionId_userId: { auctionId, userId: input.userId } },
        create: { auctionId, userId: input.userId, maxAmount: input.maxAmount },
        update: { maxAmount: input.maxAmount, active: true },
      });
    }
  });
}

async function broadcast(input: PlaceBidInput, result: BidSuccess): Promise<void> {
  const { auctionId } = input;

  const history = result.events.map((event) => ({
    alias: bidderAlias(auctionId, event.userId),
    amount: event.amount,
    isAuto: event.isAuto,
    at: event.at,
    // Consumed by the socket client to tag "You" without leaking who is who.
    userId: event.userId,
  }));

  emitToAuction(auctionId, 'auction:update', {
    auctionId,
    price: result.price,
    minNextBid: result.minNextBid,
    bidCount: result.bidCount,
    endsAt: result.endsAt,
    version: result.version,
    reserveMet: result.reserveMet,
    extended: result.extended,
    leaderId: result.leaderId,
    events: history,
  });

  // Tell the person who just lost the lead, and nobody else.
  const previousLeaders = new Set(
    result.events.filter((e) => e.userId !== result.leaderId).map((e) => e.userId),
  );
  const outbid = await prisma.bid.findMany({
    where: { auctionId, bidderId: { not: result.leaderId } },
    distinct: ['bidderId'],
    select: { bidderId: true },
  });
  for (const row of outbid) previousLeaders.add(row.bidderId);
  previousLeaders.delete(result.leaderId);

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { title: true },
  });

  for (const userId of previousLeaders) {
    emitToUser(userId, 'bid:outbid', { auctionId, price: result.price });
  }

  // One durable notification for the bidder who actually held the lead before.
  const displaced = result.events.find((e) => !e.isAuto && e.userId !== result.leaderId);
  if (displaced && auction) {
    await notify({
      userId: displaced.userId,
      type: 'OUTBID',
      title: 'You were outbid',
      body: `${auction.title} is now at ${formatINR(result.price)}.`,
      auctionId,
    });
  }
}

/**
 * Repair the Postgres projection from the authoritative Redis state.
 * Called by the closer before settling, so a crash between steps 2 and 3
 * cannot produce a winner that disagrees with the last accepted bid.
 */
export async function reconcile(auctionId: string, price: number, leaderId: string, bidCount: number): Promise<void> {
  await prisma.auction.updateMany({
    where: { id: auctionId, currentBid: { lt: price } },
    data: { currentBid: price, bidCount, winnerId: leaderId || null },
  });
}
