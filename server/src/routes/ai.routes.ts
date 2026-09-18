import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { priceEstimator } from '../services/pricing';
import { env } from '../config/env';

export const aiRouter = Router();

const estimateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(4000).optional(),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  condition: z.enum(['NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'FOR_PARTS']),
});

/**
 * Price estimate for the Create Auction screen.
 * The active implementation is reported in the response so the UI can label it
 * accurately instead of implying a model that is not connected.
 */
aiRouter.post(
  '/price-estimate',
  requireAuth,
  rateLimit({ scope: 'price-estimate', points: 20, windowSeconds: 60 }),
  validateBody(estimateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof estimateSchema>;
    const estimate = await priceEstimator.estimate(body);
    res.json({ estimate, providerConfigured: env.PRICE_ESTIMATOR_PROVIDER });
  }),
);
