import { env } from '../../config/env';
import type { PriceEstimator, PriceEstimateRequest, PriceEstimateResult } from './types';

/**
 * Adapter for a real model endpoint (your own service, a hosted LLM, a
 * regression API — anything that speaks JSON).
 *
 * It is inert unless PRICE_ESTIMATOR_PROVIDER=http and PRICE_ESTIMATOR_URL are
 * both set; there is no hardcoded vendor and no fake call anywhere. The API key
 * is read from the server environment and never reaches the browser.
 *
 * Expected response shape (all amounts in paise):
 *   { suggestedStartPrice, estimatedLow, estimatedHigh, suggestedReserve,
 *     suggestedIncrement, confidence, sampleSize?, notes?[] }
 */
export class HttpPriceEstimator implements PriceEstimator {
  async estimate(request: PriceEstimateRequest): Promise<PriceEstimateResult> {
    if (!env.PRICE_ESTIMATOR_URL) {
      throw new Error('PRICE_ESTIMATOR_URL is not set. See server/.env.example.');
    }

    const response = await fetch(env.PRICE_ESTIMATOR_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.PRICE_ESTIMATOR_API_KEY
          ? { authorization: `Bearer ${env.PRICE_ESTIMATOR_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Price estimator responded ${response.status}`);
    }

    const data = (await response.json()) as Partial<PriceEstimateResult>;

    return {
      provider: 'http',
      method: data.method ?? 'External price model',
      suggestedStartPrice: data.suggestedStartPrice ?? 0,
      estimatedLow: data.estimatedLow ?? 0,
      estimatedHigh: data.estimatedHigh ?? 0,
      suggestedReserve: data.suggestedReserve ?? 0,
      suggestedIncrement: data.suggestedIncrement ?? 10_000,
      confidence: data.confidence ?? 0.5,
      sampleSize: data.sampleSize ?? 0,
      comparables: data.comparables ?? [],
      notes: data.notes ?? [],
    };
  }
}
