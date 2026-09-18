import type { Auction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { redis, keys } from '../lib/redis';

/**
 * Redis mirror of an ACTIVE auction.
 *
 * Postgres remains the source of truth for history; Redis holds only the four
 * fields a bid has to read and write (price, leader, deadline, counters) so the
 * hot path is a single round trip instead of a transaction over several tables.
 * Hydration is lazy: the first bid or page view on an auction pulls it in.
 */
export interface HotAuction {
  id: string;
  status: string;
  sellerId: string;
  startPrice: number;
  minIncrement: number;
  currentBid: number;
  leaderId: string;
  bidCount: number;
  endsAt: number;
  reservePrice: number;
  version: number;
}

function ttlSeconds(endsAt: Date): number {
  // Keep the key a day past the close so settlement and late readers still see it.
  const ms = endsAt.getTime() - Date.now();
  return Math.max(3600, Math.ceil(ms / 1000) + 86_400);
}

export async function hydrate(auctionId: string): Promise<HotAuction | null> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { autoBids: { where: { active: true } } },
  });
  if (!auction) return null;

  const key = keys.auction(auction.id);
  const hot: Record<string, string | number> = {
    id: auction.id,
    status: auction.status,
    sellerId: auction.sellerId,
    startPrice: auction.startPrice,
    minIncrement: auction.minIncrement,
    currentBid: auction.currentBid,
    leaderId: auction.winnerId ?? (await currentLeaderFromDb(auction.id)) ?? '',
    bidCount: auction.bidCount,
    endsAt: auction.endsAt.getTime(),
    reservePrice: auction.reservePrice ?? 0,
    version: 0,
  };

  const pipe = redis.multi();
  pipe.hset(key, hot);
  pipe.expire(key, ttlSeconds(auction.endsAt));

  if (auction.autoBids.length > 0) {
    const map: Record<string, string> = {};
    for (const ab of auction.autoBids) map[ab.userId] = String(ab.maxAmount);
    pipe.hset(keys.autoBids(auction.id), map);
    pipe.expire(keys.autoBids(auction.id), ttlSeconds(auction.endsAt));
  }

  if (auction.status === 'ACTIVE') {
    pipe.zadd(keys.activeIndex(), auction.endsAt.getTime(), auction.id);
  } else {
    pipe.zrem(keys.activeIndex(), auction.id);
  }

  await pipe.exec();
  return { ...(hot as unknown as HotAuction) };
}

async function currentLeaderFromDb(auctionId: string): Promise<string | null> {
  const top = await prisma.bid.findFirst({
    where: { auctionId },
    orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
    select: { bidderId: true },
  });
  return top?.bidderId ?? null;
}

export async function read(auctionId: string): Promise<HotAuction | null> {
  const raw = await redis.hgetall(keys.auction(auctionId));
  if (!raw || !raw.id) return hydrate(auctionId);
  return {
    id: raw.id,
    status: raw.status,
    sellerId: raw.sellerId,
    startPrice: Number(raw.startPrice),
    minIncrement: Number(raw.minIncrement),
    currentBid: Number(raw.currentBid),
    leaderId: raw.leaderId ?? '',
    bidCount: Number(raw.bidCount),
    endsAt: Number(raw.endsAt),
    reservePrice: Number(raw.reservePrice ?? 0),
    version: Number(raw.version ?? 0),
  };
}

/** A user's own ceiling. Only ever returned to that user. */
export async function readMyMax(auctionId: string, userId: string): Promise<number | null> {
  const value = await redis.hget(keys.autoBids(auctionId), userId);
  if (value != null) return Number(value);
  const row = await prisma.autoBid.findUnique({
    where: { auctionId_userId: { auctionId, userId } },
  });
  return row?.active ? row.maxAmount : null;
}

export async function clearMax(auctionId: string, userId: string): Promise<void> {
  // Only removable while the user is not the standing leader — enforced by the
  // caller, because withdrawing a winning proxy mid-auction would be abusable.
  await redis.hdel(keys.autoBids(auctionId), userId);
  await prisma.autoBid.updateMany({
    where: { auctionId, userId },
    data: { active: false },
  });
}

export async function forget(auctionId: string): Promise<void> {
  await redis
    .multi()
    .del(keys.auction(auctionId))
    .del(keys.autoBids(auctionId))
    .zrem(keys.activeIndex(), auctionId)
    .exec();
}

export function publicAuctionState(auction: Auction) {
  return {
    currentBid: auction.currentBid,
    bidCount: auction.bidCount,
    endsAt: auction.endsAt,
    status: auction.status,
    reserveMet: auction.reservePrice ? auction.currentBid >= auction.reservePrice : true,
    hasReserve: auction.reservePrice != null && auction.reservePrice > 0,
  };
}
