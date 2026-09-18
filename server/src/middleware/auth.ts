import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface TokenPayload {
  sub: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

function extract(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.bidnova_token;
  return cookie ?? null;
}

/** Attaches req.user when a valid token is present. Never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extract(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = { id: payload.sub, username: payload.username, role: payload.role };
  }
  next();
}

/** Hard gate. Every write endpoint sits behind this. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access only.' } });
    return;
  }
  next();
}

/** Confirms the account still exists — used on session restore. */
export async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, username: true, displayName: true, role: true,
      avatarUrl: true, bio: true, location: true, ratingAvg: true, ratingCount: true, createdAt: true,
    },
  });
}
