import { env } from '../../config/env';
import { HeuristicPriceEstimator } from './heuristic.estimator';
import { HttpPriceEstimator } from './http.estimator';
import type { PriceEstimator } from './types';

export * from './types';

/** Single place the implementation is chosen. */
export const priceEstimator: PriceEstimator =
  env.PRICE_ESTIMATOR_PROVIDER === 'http' ? new HttpPriceEstimator() : new HeuristicPriceEstimator();
