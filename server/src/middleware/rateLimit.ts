import type { Request, Response, NextFunction } from 'express';
import { consumeRateLimit } from '../redis/scripts';
import { ApiError } from './error';

/**
 * Generic HTTP limiter backed by the same Lua sliding window as bidding.
 * Keyed by user when signed in, by IP otherwise.
 */
export function rateLimit(options: { scope: string; points: number; windowSeconds: number }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const subject = req.user?.id ?? req.ip ?? 'anonymous';
      const result = await consumeRateLimit(
        `rl:${options.scope}:${subject}`,
        options.points,
        options.windowSeconds * 1000,
        `${Date.now()}:${Math.random().toString(36).slice(2)}`,
      );
      if (!result.allowed) {
        throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Slow down for a moment.', {
          retryAfterMs: result.retryAfterMs,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
