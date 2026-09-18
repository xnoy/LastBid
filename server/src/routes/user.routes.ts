import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, ApiError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AUCTION_CARD_SELECT, toCardDto } from '../services/auction.service';

export const userRouter = Router();

/** Public seller profile. No email, no order data. */
userRouter.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, bio: true,
        location: true, ratingAvg: true, ratingCount: true, createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'No seller with that name.');

    const [active, sold] = await Promise.all([
      prisma.auction.findMany({
        where: { sellerId: user.id, status: 'ACTIVE' },
        select: AUCTION_CARD_SELECT,
        orderBy: { endsAt: 'asc' },
        take: 24,
      }),
      prisma.auction.findMany({
        where: { sellerId: user.id, status: 'SOLD' },
        select: AUCTION_CARD_SELECT,
        orderBy: { endedAt: 'desc' },
        take: 12,
      }),
    ]);

    res.json({ user, active: active.map(toCardDto), sold: sold.map(toCardDto) });
  }),
);

const profileSchema = z.object({
  displayName: z.string().min(2).max(48).optional(),
  bio: z.string().max(400).optional(),
  location: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

userRouter.patch(
  '/me/profile',
  requireAuth,
  validateBody(profileSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof profileSchema>;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...body, avatarUrl: body.avatarUrl || null },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, bio: true, location: true, ratingAvg: true, ratingCount: true, createdAt: true,
      },
    });
    res.json({ user });
  }),
);

/** The signed-in seller's own listings, including sold and unsold ones. */
userRouter.get(
  '/me/auctions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const auctions = await prisma.auction.findMany({
      where: { sellerId: req.user!.id },
      select: { ...AUCTION_CARD_SELECT, reservePrice: true, endedAt: true },
      orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
    });
    // The seller is allowed to see their own reserve amounts.
    res.json({ items: auctions });
  }),
);
