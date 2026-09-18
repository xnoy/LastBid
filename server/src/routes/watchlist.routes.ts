import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler, ApiError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { AUCTION_CARD_SELECT, toCardDto } from '../services/auction.service';

export const watchlistRouter = Router();

watchlistRouter.use(requireAuth);

watchlistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { auction: { select: AUCTION_CARD_SELECT } },
    });
    res.json({ items: items.map((item) => toCardDto(item.auction)) });
  }),
);

/** Just the ids — the marketplace uses this to fill in heart icons cheaply. */
watchlistRouter.get(
  '/ids',
  asyncHandler(async (req, res) => {
    const rows = await prisma.watchlistItem.findMany({
      where: { userId: req.user!.id },
      select: { auctionId: true },
    });
    res.json({ ids: rows.map((r) => r.auctionId) });
  }),
);

watchlistRouter.post(
  '/:auctionId',
  asyncHandler(async (req, res) => {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.auctionId } });
    if (!auction) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    await prisma.watchlistItem.upsert({
      where: { userId_auctionId: { userId: req.user!.id, auctionId: auction.id } },
      create: { userId: req.user!.id, auctionId: auction.id },
      update: {},
    });
    res.status(201).json({ watching: true });
  }),
);

watchlistRouter.delete(
  '/:auctionId',
  asyncHandler(async (req, res) => {
    await prisma.watchlistItem.deleteMany({
      where: { userId: req.user!.id, auctionId: req.params.auctionId },
    });
    res.json({ watching: false });
  }),
);
