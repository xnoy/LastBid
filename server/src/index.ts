import http from 'node:http';
import { env } from './config/env';
import { createApp } from './app';
import { createSocketServer } from './realtime/socket';
import { startAuctionCloser, stopAuctionCloser, reindexActiveAuctions } from './jobs/auctionCloser';
import { prisma } from './lib/prisma';
import { closeRedis, redis } from './lib/redis';
// Registers the Lua commands on the shared Redis client before first use.
import './redis/scripts';

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  await redis.ping();
  const restored = await reindexActiveAuctions();
  console.log(`[boot] restored ${restored} active auction(s) into Redis`);

  startAuctionCloser();

  server.listen(env.PORT, () => {
    console.log(`[boot] BidNova API on http://localhost:${env.PORT}  (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[shutdown] ${signal}`);
    stopAuctionCloser();
    server.close();
    await Promise.allSettled([prisma.$disconnect(), closeRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[boot] failed to start', err);
  process.exit(1);
});
