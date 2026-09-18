import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError, asyncHandler } from '../middleware/error';
import { validateBody, validateQuery, getQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import {
  createAuction, discover, getAuctionDetail, homeFeed, AUCTION_CARD_SELECT, toCardDto,
  type SortKey,
} from '../services/auction.service';
import { isValidCategoryPair, CATEGORIES, DURATION_OPTIONS } from '../shared/categories';
import { forget } from '../services/auctionState.service';

export const auctionRouter = Router();

auctionRouter.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES, durations: DURATION_OPTIONS });
});

auctionRouter.get(
  '/home',
  asyncHandler(async (_req, res) => {
    res.json(await homeFeed());
  }),
);

const discoverySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().max(40).optional(),
  subcategory: z.string().max(40).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  condition: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(',')).filter(Boolean))
    .optional(),
  endingWithinHours: z.coerce.number().int().min(1).max(168).optional(),
  sort: z.enum(['ending-soon', 'newest', 'current-bid', 'most-bids']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(48).optional(),
  sellerId: z.string().optional(),
});

auctionRouter.get(
  '/',
  validateQuery(discoverySchema),
  asyncHandler(async (req, res) => {
    const query = getQuery<z.infer<typeof discoverySchema>>(req);
    res.json(await discover({ ...query, sort: query.sort as SortKey | undefined }));
  }),
);

/** Vertical clips for the BidTok feed. Only listings that actually have video. */
auctionRouter.get(
  '/feed/bidtok',
  asyncHandler(async (_req, res) => {
    const items = await prisma.auction.findMany({
      where: { status: 'ACTIVE', NOT: { videoUrl: null } },
      select: { ...AUCTION_CARD_SELECT, description: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ items: items.map(toCardDto) });
  }),
);

const createSchema = z
  .object({
    title: z.string().trim().min(6, 'Give the listing a real title.').max(120),
    description: z.string().trim().min(20, 'Buyers need at least a couple of sentences.').max(6000),
    category: z.string(),
    subcategory: z.string(),
    images: z.array(z.string().url('Image links must be full URLs.')).min(1, 'Add at least one photo.').max(8),
    videoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
    condition: z.enum(['NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'FOR_PARTS']),
    location: z.string().trim().min(2).max(80),
    shippingInfo: z.string().trim().min(2).max(400),
    shippingCost: z.number().int().min(0).max(10_000_000),
    startPrice: z.number().int().min(100, 'Start at ₹1 or more.').max(1_000_000_000),
    minIncrement: z.number().int().min(100).max(100_000_000),
    reservePrice: z.number().int().min(0).max(1_000_000_000).optional(),
    durationHours: z.number().int().refine((h) => DURATION_OPTIONS.some((d) => d.hours === h), 'Pick one of the listed durations.'),
  })
  .refine((data) => isValidCategoryPair(data.category, data.subcategory), {
    message: 'That subcategory does not belong to the selected category.',
    path: ['subcategory'],
  })
  .refine((data) => !data.reservePrice || data.reservePrice >= data.startPrice, {
    message: 'A reserve below the start price has no effect.',
    path: ['reservePrice'],
  });

auctionRouter.post(
  '/',
  requireAuth,
  rateLimit({ scope: 'create-auction', points: 10, windowSeconds: 3600 }),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const auction = await createAuction({ ...body, sellerId: req.user!.id });
    res.status(201).json({ auction });
  }),
);

auctionRouter.get(
  '/:idOrSlug',
  asyncHandler(async (req, res) => {
    const auction = await getAuctionDetail(req.params.idOrSlug, req.user?.id);
    if (!auction) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    res.json({ auction });
  }),
);

/** Full, paginated bid history for one auction (aliased, privacy-safe). */
auctionRouter.get(
  '/:id/bids',
  asyncHandler(async (req, res) => {
    const detail = await getAuctionDetail(req.params.id, req.user?.id);
    if (!detail) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    res.json({ bids: detail.bids });
  }),
);

/** A seller may cancel only while nobody has bid. */
auctionRouter.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    if (auction.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'This is not your listing.');
    }
    if (auction.bidCount > 0) {
      throw new ApiError(409, 'HAS_BIDS', 'Auctions with bids cannot be withdrawn.');
    }
    await prisma.auction.update({ where: { id: auction.id }, data: { status: 'CANCELLED' } });
    await forget(auction.id);
    res.json({ ok: true });
  }),
);
