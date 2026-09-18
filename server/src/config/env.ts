import 'dotenv/config';
import { z } from 'zod';

/**
 * Fail fast on boot rather than throwing `undefined is not a string` at 2am
 * during a live auction. Every value the server reads goes through here.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ANTI_SNIPE_WINDOW_SECONDS: z.coerce.number().default(60),
  ANTI_SNIPE_EXTENSION_SECONDS: z.coerce.number().default(60),
  AUCTION_CLOSER_INTERVAL_MS: z.coerce.number().default(2000),
  BID_RATE_LIMIT_POINTS: z.coerce.number().default(12),
  BID_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(10),
  PRICE_ESTIMATOR_PROVIDER: z.enum(['heuristic', 'http']).default('heuristic'),
  PRICE_ESTIMATOR_URL: z.string().optional(),
  PRICE_ESTIMATOR_API_KEY: z.string().optional(),
  STREAM_PROVIDER: z.enum(['mock', 'external']).default('mock'),
  STREAM_API_KEY: z.string().optional(),
  STREAM_API_SECRET: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(['mock', 'external']).default('mock'),
  PAYMENT_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment. Copy server/.env.example to server/.env and fill it in.');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
