import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Parses and REPLACES the incoming payload with the validated result, so
 * handlers can only ever see data that passed the schema. Unknown keys are
 * dropped rather than trusted.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    // req.query has only a getter in Express 5; assign onto a local instead.
    (req as Request & { validatedQuery?: T }).validatedQuery = parsed.data;
    next();
  };
}

export function getQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}
