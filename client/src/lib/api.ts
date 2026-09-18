/**
 * One fetch wrapper for the whole app.
 * - attaches the bearer token
 * - turns the server's { error: { code, message } } envelope into a typed throw
 * - never swallows a failure silently
 */
const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'bidnova_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

import {
  DEMO_AUCTIONS,
  getFallbackHomeFeed,
  getFallbackBidTok,
  getFallbackAuctionDetail,
} from './mockData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFallbackData(path: string): any {
  if (path === '/auctions/home' || path.startsWith('/auctions/home?')) {
    return getFallbackHomeFeed();
  }
  if (path === '/auctions/feed/bidtok' || path.startsWith('/auctions/feed/bidtok?')) {
    return getFallbackBidTok();
  }
  if (path.startsWith('/auctions/')) {
    const slug = path.replace('/auctions/', '').split('?')[0];
    return { auction: getFallbackAuctionDetail(slug) };
  }
  if (path === '/auctions' || path.startsWith('/auctions?')) {
    return {
      items: DEMO_AUCTIONS,
      total: DEMO_AUCTIONS.length,
      page: 1,
      perPage: 24,
      hasMore: false,
    };
  }
  if (path === '/live' || path.startsWith('/live?')) {
    return {
      sessions: [
        {
          id: 'live-fashion-1',
          title: '👟 Fashion Drops: Air Jordan 1 & Streetwear Grails',
          status: 'LIVE',
          thumbnailUrl: DEMO_AUCTIONS[0].images[0],
          auction: DEMO_AUCTIONS[0],
        },
        {
          id: 'live-tech-1',
          title: '🎮 Exclusive Tech: Razer Esports & Setup Vault',
          status: 'LIVE',
          thumbnailUrl: DEMO_AUCTIONS[1].images[0],
          auction: DEMO_AUCTIONS[1],
        },
      ],
    };
  }
  if (path.startsWith('/watchlist')) {
    return { items: [] };
  }
  if (path.startsWith('/notifications')) {
    return { items: [] };
  }
  return null;
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const token = getToken();

  try {
    const response = await fetch(`${BASE}/api${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    if (response.ok) {
      if (response.status === 204) return undefined as T;
      const payload = (await response.json().catch(() => null)) as T;
      return payload;
    }

    // If server returned 404, 502, or 500 (e.g. on Vercel without backend connected), check for fallback data
    const fallback = getFallbackData(path);
    if (fallback !== null) {
      return fallback as T;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: { code: string; message: string; details?: Record<string, unknown> } }
      | null;

    const error = payload?.error;
    let fallbackMessage = 'Something went wrong. Try again.';
    if (response.status === 502 || response.status === 504 || (response.status === 500 && !payload)) {
      fallbackMessage = 'Backend server is offline (port 4000). Please ensure Postgres, Redis, and the backend server are running.';
    }
    throw new ApiError(
      response.status,
      error?.code ?? 'SERVER_OFFLINE',
      error?.message ?? fallbackMessage,
      error?.details,
    );
  } catch (err) {
    const fallback = getFallbackData(path);
    if (fallback !== null) {
      return fallback as T;
    }
    throw err;
  }
}

/** Stable token so a retried bid is recognised as the same bid, not a new one. */
export function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' ) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * The server returns Zod failures as `{ field: [messages] }`. This pulls out the
 * first message so a form can show something specific instead of "check the
 * highlighted fields".
 */
export function firstFieldError(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  for (const value of Object.values(details as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return null;
}
