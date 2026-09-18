import fs from 'node:fs';
import path from 'node:path';
import { redis, keys } from '../lib/redis';

/**
 * Loads the .lua files once at boot and exposes typed wrappers.
 * ioredis `defineCommand` uses EVALSHA with an automatic EVAL fallback, so the
 * script body travels over the wire at most once per Redis instance.
 */
const luaDir = path.join(__dirname, 'lua');

function load(file: string): string {
  return fs.readFileSync(path.join(luaDir, `${file}.lua`), 'utf8');
}

declare module 'ioredis' {
  interface RedisCommander<Context> {
    placeBid(
      auctionKey: string,
      autoKey: string,
      indexKey: string,
      reqKey: string,
      userId: string,
      maxAmount: string,
      now: string,
      snipeWindowMs: string,
      snipeExtensionMs: string,
      declaredCurrentBid: string,
    ): Promise<string>;
    closeAuction(auctionKey: string, indexKey: string, now: string): Promise<string>;
    rateLimit(
      key: string,
      now: string,
      windowMs: string,
      maxPoints: string,
      member: string,
    ): Promise<[number, number, number]>;
  }
}

redis.defineCommand('placeBid', { numberOfKeys: 4, lua: load('place_bid') });
redis.defineCommand('closeAuction', { numberOfKeys: 2, lua: load('close_auction') });
redis.defineCommand('rateLimit', { numberOfKeys: 1, lua: load('rate_limit') });

export type BidFailureCode =
  | 'AUCTION_NOT_LOADED'
  | 'AUCTION_NOT_ACTIVE'
  | 'AUCTION_ENDED'
  | 'SELLER_CANNOT_BID'
  | 'INVALID_AMOUNT'
  | 'BID_TOO_LOW'
  | 'STALE_BID'
  | 'MAX_NOT_INCREASED';

export interface BidEvent {
  userId: string;
  amount: number;
  isAuto: boolean;
  at: number;
}

export interface BidSuccess {
  ok: true;
  code: 'OK';
  price: number;
  leaderId: string;
  endsAt: number;
  bidCount: number;
  version: number;
  reserveMet: boolean;
  minNextBid: number;
  extended: boolean;
  events: BidEvent[];
}

export interface BidFailure {
  ok: false;
  code: BidFailureCode;
  price?: number;
  minNextBid?: number;
  version?: number;
}

export type BidScriptResult = BidSuccess | BidFailure;

export interface CloseResult {
  ok: boolean;
  code: 'CLOSED' | 'ALREADY_CLOSED' | 'STILL_RUNNING' | 'AUCTION_NOT_LOADED';
  price?: number;
  leaderId?: string;
  bidCount?: number;
  sellerId?: string;
  reserveMet?: boolean;
}

/** cjson encodes an empty Lua table as `{}`, so normalise it back to a list. */
function asEvents(value: unknown): BidEvent[] {
  return Array.isArray(value) ? (value as BidEvent[]) : [];
}

export async function runPlaceBid(params: {
  auctionId: string;
  userId: string;
  maxAmount: number;
  requestId?: string;
  declaredCurrentBid?: number;
  snipeWindowMs: number;
  snipeExtensionMs: number;
}): Promise<BidScriptResult> {
  const reqKey = params.requestId
    ? `${keys.auction(params.auctionId)}:req:${params.requestId}`
    : '';

  const raw = await redis.placeBid(
    keys.auction(params.auctionId),
    keys.autoBids(params.auctionId),
    keys.activeIndex(),
    reqKey,
    params.userId,
    String(params.maxAmount),
    String(Date.now()),
    String(params.snipeWindowMs),
    String(params.snipeExtensionMs),
    String(params.declaredCurrentBid ?? -1),
  );

  const parsed = JSON.parse(raw) as BidScriptResult;
  if (parsed.ok) parsed.events = asEvents((parsed as BidSuccess).events);
  return parsed;
}

export async function runCloseAuction(auctionId: string): Promise<CloseResult> {
  const raw = await redis.closeAuction(
    keys.auction(auctionId),
    keys.activeIndex(),
    String(Date.now()),
  );
  return JSON.parse(raw) as CloseResult;
}

export async function consumeRateLimit(
  key: string,
  maxPoints: number,
  windowMs: number,
  member: string,
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const [allowed, remaining, retryAfterMs] = await redis.rateLimit(
    key,
    String(Date.now()),
    String(windowMs),
    String(maxPoints),
    member,
  );
  return { allowed: allowed === 1, remaining, retryAfterMs };
}
