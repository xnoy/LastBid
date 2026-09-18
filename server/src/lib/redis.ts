import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Three connections on purpose:
 *  - `redis`    general commands + Lua (the bid hot path)
 *  - `pubClient`/`subClient` are handed to the Socket.IO Redis adapter so bid
 *    broadcasts fan out across every server instance. A node in subscriber
 *    mode cannot run normal commands, hence the separation.
 */
function create(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // Keep the socket hot; auction traffic is bursty.
    keepAlive: 10_000,
  });
  client.on('error', (err) => console.error(`[redis:${label}]`, err.message));
  return client;
}

export const redis = create('main');
export const pubClient = create('pub');
export const subClient = pubClient.duplicate();

/** Key layout, in one place so nothing drifts. */
export const keys = {
  auction: (id: string) => `auction:${id}`,
  autoBids: (id: string) => `auction:${id}:autobids`,
  bidLog: (id: string) => `auction:${id}:log`,
  activeIndex: () => 'auctions:active', // sorted set, score = endsAt epoch ms
  rateLimit: (userId: string) => `rl:bid:${userId}`,
  viewers: (sessionId: string) => `live:${sessionId}:viewers`,
};

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), pubClient.quit(), subClient.quit()]);
}
