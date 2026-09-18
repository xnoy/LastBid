import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { corsOrigins } from '../config/env';
import { pubClient, subClient, redis, keys } from '../lib/redis';
import { verifyToken } from '../middleware/auth';
import { setIo } from './bus';
import { read } from '../services/auctionState.service';
import { prisma } from '../lib/prisma';
import { consumeRateLimit } from '../redis/scripts';

/**
 * Socket layer.
 *
 * Read-only: clients subscribe to rooms and receive pushes. Bids are NOT
 * accepted over the socket — they go through the authenticated HTTP endpoint,
 * so there is exactly one validation path. This keeps the fan-out channel
 * cheap and means a flooded socket can never bypass bid validation.
 *
 * Rooms:  auction:<id>   live:<sessionId>   user:<userId>
 * The Redis adapter mirrors every emit across instances, so horizontal scaling
 * needs no sticky bid routing (only sticky sessions for the socket itself).
 */
export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    // Long polling first is unnecessary here; go straight to WebSocket.
    transports: ['websocket', 'polling'],
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });

  io.adapter(createAdapter(pubClient, subClient));
  setIo(io);

  // Optional auth: anyone can watch, only signed-in users get a user room.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      const payload = verifyToken(token);
      if (payload) socket.data.userId = payload.sub;
    }
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);

    socket.on('auction:join', async (auctionId: unknown) => {
      if (typeof auctionId !== 'string' || auctionId.length > 40) return;
      socket.join(`auction:${auctionId}`);
      // Send the authoritative current state immediately, so a client that
      // joins mid-auction never renders a stale price.
      const state = await read(auctionId);
      if (state) {
        socket.emit('auction:state', {
          auctionId,
          price: state.currentBid,
          minNextBid: state.currentBid === 0 ? state.startPrice : state.currentBid + state.minIncrement,
          bidCount: state.bidCount,
          endsAt: state.endsAt,
          version: state.version,
          leaderId: state.leaderId,
          status: state.status,
        });
      }
    });

    socket.on('auction:leave', (auctionId: unknown) => {
      if (typeof auctionId === 'string') socket.leave(`auction:${auctionId}`);
    });

    socket.on('live:join', async (sessionId: unknown) => {
      if (typeof sessionId !== 'string') return;
      socket.join(`live:${sessionId}`);
      socket.data.liveSessionId = sessionId;
      const viewers = await redis.incr(keys.viewers(sessionId));
      await redis.expire(keys.viewers(sessionId), 86_400);
      io.to(`live:${sessionId}`).emit('live:viewers', { sessionId, viewers });
    });

    socket.on('live:chat', async (payload: unknown) => {
      const data = payload as { sessionId?: string; body?: string };
      if (!userId || typeof data?.sessionId !== 'string') return;
      const body = String(data.body ?? '').trim().slice(0, 240);
      if (!body) return;

      // Chat is rate limited on the server; the client cannot opt out.
      const limit = await consumeRateLimit(
        `rl:chat:${userId}`, 8, 10_000, `${Date.now()}:${Math.random()}`,
      );
      if (!limit.allowed) {
        socket.emit('live:chat-rejected', { reason: 'Slow down a moment.' });
        return;
      }

      const message = await prisma.liveChatMessage.create({
        data: { sessionId: data.sessionId, userId, body },
        include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
      });
      io.to(`live:${data.sessionId}`).emit('live:chat', message);
    });

    socket.on('disconnect', async () => {
      const sessionId = socket.data.liveSessionId as string | undefined;
      if (sessionId) {
        const viewers = await redis.decr(keys.viewers(sessionId));
        io.to(`live:${sessionId}`).emit('live:viewers', {
          sessionId,
          viewers: Math.max(0, viewers),
        });
      }
    });
  });

  return io;
}
