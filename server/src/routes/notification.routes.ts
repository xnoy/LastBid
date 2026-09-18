import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);
    res.json({ items, unread });
  }),
);

notificationRouter.post(
  '/read',
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : undefined;
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, ...(ids ? { id: { in: ids } } : {}) },
      data: { read: true },
    });
    res.json({ ok: true });
  }),
);
