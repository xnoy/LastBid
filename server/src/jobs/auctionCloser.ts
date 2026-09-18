import { env } from '../config/env';
import { redis, keys } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { settleAuction } from '../services/settlement.service';
import { hydrate } from '../services/auctionState.service';
import { emitToAuction } from '../realtime/bus';

/**
 * Closes auctions whose clock has run out.
 *
 * The sorted set `auctions:active` is scored by end time, so finding everything
 * due is one ZRANGEBYSCORE regardless of how many auctions exist. Settlement
 * itself is guarded by close_auction.lua, so running this job on every instance
 * is safe — duplicates simply lose the race and do nothing.
 */
let timer: NodeJS.Timeout | null = null;

async function tick(): Promise<void> {
  const now = Date.now();
  const due = await redis.zrangebyscore(keys.activeIndex(), 0, now, 'LIMIT', 0, 50);

  for (const auctionId of due) {
    try {
      await settleAuction(auctionId);
    } catch (err) {
      console.error(`[closer] failed to settle ${auctionId}`, err);
    }
  }

  // Warn watchers a minute out so the UI can switch to its urgent state.
  const soon = await redis.zrangebyscore(keys.activeIndex(), now, now + 60_000, 'LIMIT', 0, 50);
  for (const auctionId of soon) {
    emitToAuction(auctionId, 'auction:ending-soon', { auctionId });
  }
}

/**
 * Pulls any ACTIVE auction that Redis has forgotten (cold start, flushed cache,
 * fresh deployment) back into the index so it can still be closed on time.
 */
export async function reindexActiveAuctions(): Promise<number> {
  const auctions = await prisma.auction.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  for (const auction of auctions) await hydrate(auction.id);
  return auctions.length;
}

export function startAuctionCloser(): void {
  if (timer) return;
  timer = setInterval(() => {
    void tick().catch((err) => console.error('[closer] tick failed', err));
  }, env.AUCTION_CLOSER_INTERVAL_MS);
  console.log(`[closer] scanning every ${env.AUCTION_CLOSER_INTERVAL_MS}ms`);
}

export function stopAuctionCloser(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
