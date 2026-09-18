import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, ApiError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { streamProvider } from '../services/streaming';
import { AUCTION_CARD_SELECT, toCardDto } from '../services/auction.service';
import { emitGlobal } from '../realtime/bus';

export const liveRouter = Router();

const HOST_SELECT = { id: true, username: true, displayName: true, avatarUrl: true, ratingAvg: true, ratingCount: true };

liveRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.liveSession.findMany({
      where: { status: { in: ['LIVE', 'SCHEDULED'] } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { host: { select: HOST_SELECT }, auction: { select: AUCTION_CARD_SELECT } },
    });
    res.json({
      items: sessions.map((s) => ({
        ...s,
        ingestUrl: undefined, // host-only
        auction: toCardDto(s.auction),
      })),
    });
  }),
);

liveRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await prisma.liveSession.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: HOST_SELECT },
        auction: { select: AUCTION_CARD_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        },
      },
    });
    if (!session) throw new ApiError(404, 'NOT_FOUND', 'That live room has ended.');

    const isHost = req.user?.id === session.hostId;
    res.json({
      session: {
        ...session,
        // Ingest credentials go to the host and nobody else.
        ingestUrl: isHost ? session.ingestUrl : undefined,
        auction: toCardDto(session.auction),
        messages: session.messages.reverse(),
        // Honest signal for the UI: false with the default mock provider.
        isLiveVideoAvailable: Boolean(session.playbackUrl),
        streamProvider: streamProvider.name,
      },
    });
  }),
);

const createSchema = z.object({
  auctionId: z.string().min(1),
  title: z.string().min(4).max(100),
  thumbnailUrl: z.string().url().optional(),
});

liveRouter.post(
  '/',
  requireAuth,
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const auction = await prisma.auction.findUnique({ where: { id: body.auctionId } });
    if (!auction) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    if (auction.sellerId !== req.user!.id) throw new ApiError(403, 'FORBIDDEN', 'Only the seller can go live.');
    if (auction.status !== 'ACTIVE') throw new ApiError(409, 'NOT_ACTIVE', 'That auction is not running.');

    const existing = await prisma.liveSession.findUnique({ where: { auctionId: auction.id } });
    if (existing) throw new ApiError(409, 'ALREADY_EXISTS', 'This auction already has a live room.');

    const session = await prisma.liveSession.create({
      data: {
        title: body.title,
        hostId: req.user!.id,
        auctionId: auction.id,
        thumbnailUrl: body.thumbnailUrl ?? auction.images[0],
        status: 'LIVE',
        startedAt: new Date(),
      },
    });

    const channel = await streamProvider.createChannel({ sessionId: session.id, title: body.title });
    const updated = await prisma.liveSession.update({
      where: { id: session.id },
      data: {
        providerStream: channel.providerStreamId,
        ingestUrl: `${channel.ingestUrl}/${channel.ingestKey}`,
        playbackUrl: channel.playbackUrl,
      },
    });

    emitGlobal('live:started', { sessionId: updated.id, title: updated.title });
    res.status(201).json({ session: updated, isLiveVideoAvailable: channel.isLiveVideoAvailable });
  }),
);

liveRouter.post(
  '/:id/end',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new ApiError(404, 'NOT_FOUND', 'That live room has ended.');
    if (session.hostId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only the host can end this room.');
    }
    if (session.providerStream) await streamProvider.endChannel(session.providerStream);
    await prisma.liveSession.update({
      where: { id: session.id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
