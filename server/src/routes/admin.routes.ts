import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { settleAuction } from '../services/settlement.service';
import { redis, keys } from '../lib/redis';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

/** Counts come straight from the database — nothing here is invented. */
adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, activeAuctions, soldAuctions, bids, orders, liveNow, gmvRow, activeIndexSize] =
      await Promise.all([
        prisma.user.count(),
        prisma.auction.count({ where: { status: 'ACTIVE' } }),
        prisma.auction.count({ where: { status: 'SOLD' } }),
        prisma.bid.count(),
        prisma.order.count(),
        prisma.liveSession.count({ where: { status: 'LIVE' } }),
        prisma.order.aggregate({ _sum: { total: true } }),
        redis.zcard(keys.activeIndex()),
      ]);

    res.json({
      users,
      activeAuctions,
      soldAuctions,
      bids,
      orders,
      liveNow,
      grossMerchandiseValue: gmvRow._sum.total ?? 0,
      redisTrackedAuctions: activeIndexSize,
    });
  }),
);

adminRouter.get(
  '/auctions',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const auctions = await prisma.auction.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, title: true, status: true, currentBid: true, bidCount: true,
        endsAt: true, createdAt: true,
        seller: { select: { username: true } },
      },
    });
    res.json({ items: auctions });
  }),
);

/** Force-settle a stuck auction. Idempotent: the Lua gate makes sure of that. */
adminRouter.post(
  '/auctions/:id/settle',
  asyncHandler(async (req, res) => {
    await settleAuction(req.params.id);
    res.json({ ok: true });
  }),
);

adminRouter.post(
  '/auctions/:id/cancel',
  asyncHandler(async (req, res) => {
    await prisma.auction.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    await redis.zrem(keys.activeIndex(), req.params.id);
    res.json({ ok: true });
  }),
);
