import { prisma } from '../lib/prisma';
import { runCloseAuction } from '../redis/scripts';
import { reconcile } from './bid.service';
import { forget } from './auctionState.service';
import { emitToAuction, emitToUser, emitGlobal } from '../realtime/bus';
import { notify } from './notification.service';
import { formatINR } from '../shared/money';
import { createOrderForAuction } from './order.service';

/**
 * Settle one expired auction.
 *
 * `runCloseAuction` is the gate: it flips ACTIVE -> ENDED inside Redis, so only
 * the one process that wins that flip performs the (non-idempotent) work below.
 * Every other instance sees ALREADY_CLOSED and returns.
 */
export async function settleAuction(auctionId: string): Promise<void> {
  const closed = await runCloseAuction(auctionId);
  if (!closed.ok) return;

  const price = closed.price ?? 0;
  const leaderId = closed.leaderId ?? '';
  await reconcile(auctionId, price, leaderId, closed.bidCount ?? 0);

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { seller: { select: { id: true, displayName: true } } },
  });
  if (!auction) return;

  const hadBids = closed.bidCount ? closed.bidCount > 0 : auction.bidCount > 0;
  const reserveMet = closed.reserveMet !== false;
  const sold = hadBids && reserveMet && !!leaderId;

  const updated = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status: sold ? 'SOLD' : 'UNSOLD',
      endedAt: new Date(),
      winnerId: sold ? leaderId : null,
    },
  });

  if (sold) {
    await createOrderForAuction(updated.id, leaderId, updated.sellerId, price, updated.shippingCost);
    await notify({
      userId: leaderId,
      type: 'AUCTION_WON',
      title: 'You won',
      body: `${auction.title} is yours at ${formatINR(price)}. Complete checkout to confirm the order.`,
      auctionId,
    });
    await notify({
      userId: auction.sellerId,
      type: 'AUCTION_SOLD',
      title: 'Your item sold',
      body: `${auction.title} closed at ${formatINR(price)}.`,
      auctionId,
    });
  } else {
    await notify({
      userId: auction.sellerId,
      type: 'AUCTION_LOST',
      title: hadBids ? 'Reserve not met' : 'Auction ended with no bids',
      body: hadBids
        ? `${auction.title} closed at ${formatINR(price)}, below your reserve. Relist it whenever you like.`
        : `${auction.title} ended without any bids. Try a lower start price.`,
      auctionId,
    });
  }

  // Tell everyone still watching the page; losing bidders get the result too.
  emitToAuction(auctionId, 'auction:ended', {
    auctionId,
    status: sold ? 'SOLD' : 'UNSOLD',
    price,
    reserveMet,
    winnerId: sold ? leaderId : null,
  });
  emitGlobal('marketplace:auction-closed', { auctionId });

  const losers = await prisma.bid.findMany({
    where: { auctionId, bidderId: { not: leaderId || '__none__' } },
    distinct: ['bidderId'],
    select: { bidderId: true },
  });
  for (const loser of losers) {
    emitToUser(loser.bidderId, 'notification:new', {
      type: 'AUCTION_LOST',
      title: 'Auction ended',
      body: `${auction.title} closed at ${formatINR(price)}.`,
      auctionId,
    });
  }

  await forget(auctionId);
}
