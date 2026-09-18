import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';

/** Thrown by route handlers; anything else is treated as a 500. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Wraps async handlers so a rejected promise reaches the error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });
}

/**
 * One response shape for every failure: { error: { code, message, details? } }.
 * Internal messages are never leaked to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Check the highlighted fields.',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Something went wrong on our side. Try again.' },
  });
}
