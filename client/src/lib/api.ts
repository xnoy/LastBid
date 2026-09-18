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

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const token = getToken();

  const response = await fetch(`${BASE}/api${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { error?: { code: string; message: string; details?: Record<string, unknown> } }
    | null;

  if (!response.ok) {
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
  }

  return payload as T;
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
