import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../middleware/error';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { placeBid } from '../services/bid.service';
import { read, readMyMax, clearMax } from '../services/auctionState.service';
import { prisma } from '../lib/prisma';

export const bidRouter = Router();

const bidSchema = z.object({
  auctionId: z.string().min(1),
  /**
   * Whole rupees are sent by the UI; paise are computed here. The server never
   * accepts a price from the client — only the ceiling the user commits to.
   */
  maxAmount: z.number().int().positive().max(1_000_000_000),
  isProxy: z.boolean().default(false),
  requestId: z.string().min(8).max(64).optional(),
  declaredCurrentBid: z.number().int().min(0).optional(),
});

/**
 * Place a bid. The HTTP response is the bidder's own receipt; everyone else
 * (including this bidder's other tabs) learns about it over the socket.
 */
bidRouter.post(
  '/',
  requireAuth,
  validateBody(bidSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof bidSchema>;

    const outcome = await placeBid({
      auctionId: body.auctionId,
      userId: req.user!.id,
      maxAmount: body.maxAmount,
      isProxy: body.isProxy,
      requestId: body.requestId,
      declaredCurrentBid: body.declaredCurrentBid,
    });

    if (!outcome.ok) {
      const status = outcome.code === 'RATE_LIMITED' ? 429 : 409;
      res.status(status).json({
        error: {
          code: outcome.code,
          message: outcome.message,
          details: {
            price: outcome.price,
            minNextBid: outcome.minNextBid,
            retryAfterMs: outcome.retryAfterMs,
          },
        },
      });
      return;
    }

    res.status(201).json(outcome);
  }),
);

/** The caller's own auto-bid ceiling. Returns 403 for anyone else's. */
bidRouter.get(
  '/auto/:auctionId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [state, maxAmount] = await Promise.all([
      read(req.params.auctionId),
      readMyMax(req.params.auctionId, req.user!.id),
    ]);
    if (!state) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    res.json({
      maxAmount,
      isWinning: state.leaderId === req.user!.id,
      currentBid: state.currentBid,
      minNextBid: state.currentBid === 0 ? state.startPrice : state.currentBid + state.minIncrement,
    });
  }),
);

/** Withdraw a proxy ceiling — allowed only while you are not the leader. */
bidRouter.delete(
  '/auto/:auctionId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const state = await read(req.params.auctionId);
    if (!state) throw new ApiError(404, 'NOT_FOUND', 'That auction does not exist.');
    if (state.leaderId === req.user!.id) {
      throw new ApiError(409, 'LEADER_LOCKED', 'You are the highest bidder, so your maximum stands.');
    }
    await clearMax(req.params.auctionId, req.user!.id);
    res.json({ ok: true });
  }),
);

/** Everything the signed-in user has bid on, newest first. */
bidRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bids = await prisma.bid.findMany({
      where: { bidderId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        auction: {
          select: {
            id: true, slug: true, title: true, images: true, currentBid: true,
            endsAt: true, status: true, winnerId: true, bidCount: true, minIncrement: true,
          },
        },
      },
    });

    // Collapse to one row per auction: the user's highest bid on it.
    const byAuction = new Map<string, (typeof bids)[number]>();
    for (const bid of bids) {
      const seen = byAuction.get(bid.auctionId);
      if (!seen || bid.amount > seen.amount) byAuction.set(bid.auctionId, bid);
    }

    res.json({
      items: [...byAuction.values()].map((bid) => ({
        auction: bid.auction,
        yourBid: bid.amount,
        isAuto: bid.isAuto,
        placedAt: bid.createdAt,
        isWinning: bid.auction.winnerId === req.user!.id,
        outcome:
          bid.auction.status === 'ACTIVE'
            ? bid.auction.winnerId === req.user!.id ? 'winning' : 'outbid'
            : bid.auction.winnerId === req.user!.id ? 'won' : 'lost',
      })),
    });
  }),
);
