import type { Prisma, AuctionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hydrate } from './auctionState.service';
import { bidderAlias } from './privacy';

export type SortKey = 'ending-soon' | 'newest' | 'current-bid' | 'most-bids';

export interface DiscoveryQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  endingWithinHours?: number;
  sort?: SortKey;
  page?: number;
  perPage?: number;
  sellerId?: string;
  /** Sold and unsold listings are hidden from discovery unless asked for. */
  status?: AuctionStatus;
}

const ORDER_BY: Record<SortKey, Prisma.AuctionOrderByWithRelationInput[]> = {
  'ending-soon': [{ endsAt: 'asc' }],
  newest: [{ createdAt: 'desc' }],
  'current-bid': [{ currentBid: 'desc' }],
  'most-bids': [{ bidCount: 'desc' }],
};

export const AUCTION_CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  images: true,
  videoUrl: true,
  category: true,
  subcategory: true,
  condition: true,
  location: true,
  startPrice: true,
  currentBid: true,
  minIncrement: true,
  bidCount: true,
  status: true,
  endsAt: true,
  createdAt: true,
  reservePrice: true,
  seller: { select: { id: true, username: true, displayName: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
} satisfies Prisma.AuctionSelect;

/** Strip the reserve *amount* (seller-private) down to a met/not-met flag. */
export function toCardDto<T extends { reservePrice: number | null; currentBid: number }>(auction: T) {
  const { reservePrice, ...rest } = auction;
  return {
    ...rest,
    hasReserve: reservePrice != null && reservePrice > 0,
    reserveMet: reservePrice == null || reservePrice === 0 || auction.currentBid >= reservePrice,
  };
}

export async function discover(query: DiscoveryQuery) {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(48, Math.max(1, query.perPage ?? 24));

  const where: Prisma.AuctionWhereInput = {
    // Sold and completed listings never appear in active discovery (req. #10).
    status: query.status ?? 'ACTIVE',
  };

  if (query.sellerId) where.sellerId = query.sellerId;
  if (query.category) where.category = query.category;
  if (query.subcategory) where.subcategory = query.subcategory;
  if (query.condition?.length) where.condition = { in: query.condition as never[] };

  if (query.minPrice != null || query.maxPrice != null) {
    where.currentBid = {
      ...(query.minPrice != null ? { gte: query.minPrice } : {}),
      ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.endingWithinHours) {
    where.endsAt = { lte: new Date(Date.now() + query.endingWithinHours * 3600_000) };
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      select: AUCTION_CARD_SELECT,
      orderBy: ORDER_BY[query.sort ?? 'ending-soon'],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.auction.count({ where }),
  ]);

  return {
    items: items.map(toCardDto),
    total,
    page,
    perPage,
    hasMore: page * perPage < total,
  };
}

export async function getAuctionDetail(idOrSlug: string, viewerId?: string) {
  const auction = await prisma.auction.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      seller: {
        select: {
          id: true, username: true, displayName: true, avatarUrl: true,
          bio: true, location: true, ratingAvg: true, ratingCount: true, createdAt: true,
        },
      },
      liveSession: true,
      bids: { orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, amount: true, isAuto: true, createdAt: true, bidderId: true } },
      _count: { select: { watchers: true } },
    },
  });
  if (!auction) return null;

  const { reservePrice, bids, ...rest } = auction;
  const isSeller = viewerId === auction.sellerId;

  return {
    ...rest,
    hasReserve: reservePrice != null && reservePrice > 0,
    reserveMet: reservePrice == null || reservePrice === 0 || auction.currentBid >= reservePrice,
    // The number itself goes to the seller only.
    reservePrice: isSeller ? reservePrice : undefined,
    minNextBid: auction.currentBid === 0 ? auction.startPrice : auction.currentBid + auction.minIncrement,
    watcherCount: auction._count.watchers,
    bids: bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      isAuto: bid.isAuto,
      createdAt: bid.createdAt,
      alias: bidderAlias(auction.id, bid.bidderId),
      isYou: viewerId === bid.bidderId,
    })),
  };
}

export interface CreateAuctionInput {
  sellerId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  images: string[];
  videoUrl?: string;
  condition: string;
  location: string;
  shippingInfo: string;
  shippingCost: number;
  startPrice: number;
  minIncrement: number;
  reservePrice?: number;
  durationHours: number;
}

function slugify(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${base || 'auction'}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createAuction(input: CreateAuctionInput) {
  const endsAt = new Date(Date.now() + input.durationHours * 3600_000);

  const auction = await prisma.auction.create({
    data: {
      slug: slugify(input.title),
      title: input.title,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      images: input.images,
      videoUrl: input.videoUrl,
      condition: input.condition as never,
      location: input.location,
      shippingInfo: input.shippingInfo,
      shippingCost: input.shippingCost,
      startPrice: input.startPrice,
      minIncrement: input.minIncrement,
      reservePrice: input.reservePrice ?? null,
      sellerId: input.sellerId,
      status: 'ACTIVE',
      endsAt,
    },
    select: AUCTION_CARD_SELECT,
  });

  // Make it biddable immediately rather than on first bid.
  await hydrate(auction.id);
  return toCardDto(auction);
}

/** Homepage rails, fetched in one round trip instead of six. */
export async function homeFeed() {
  const [endingSoon, trending, recent, live] = await Promise.all([
    prisma.auction.findMany({
      where: { status: 'ACTIVE', endsAt: { gte: new Date() } },
      select: AUCTION_CARD_SELECT,
      orderBy: { endsAt: 'asc' },
      take: 8,
    }),
    prisma.auction.findMany({
      where: { status: 'ACTIVE' },
      select: AUCTION_CARD_SELECT,
      orderBy: [{ bidCount: 'desc' }, { currentBid: 'desc' }],
      take: 8,
    }),
    prisma.auction.findMany({
      where: { status: 'ACTIVE' },
      select: AUCTION_CARD_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.liveSession.findMany({
      where: { status: 'LIVE' },
      take: 6,
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        auction: { select: AUCTION_CARD_SELECT },
      },
    }),
  ]);

  const byCategory = await Promise.all(
    ['fashion', 'tech', 'collectibles', 'entertainment'].map(async (category) => ({
      category,
      items: (
        await prisma.auction.findMany({
          where: { status: 'ACTIVE', category },
          select: AUCTION_CARD_SELECT,
          orderBy: { endsAt: 'asc' },
          take: 8,
        })
      ).map(toCardDto),
    })),
  );

  return {
    endingSoon: endingSoon.map(toCardDto),
    trending: trending.map(toCardDto),
    recent: recent.map(toCardDto),
    live: live.map((session) => ({ ...session, auction: toCardDto(session.auction) })),
    byCategory,
  };
}
