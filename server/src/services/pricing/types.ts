/**
 * The contract every price-estimation provider implements.
 * Swap the implementation in pricing/index.ts; nothing else in the app changes.
 */
export interface PriceEstimateRequest {
  title: string;
  description?: string;
  category: string;
  subcategory: string;
  condition: string;
}

export interface PriceEstimateResult {
  /** Which implementation produced this, so the UI can label it honestly. */
  provider: 'heuristic' | 'http';
  /** Human-readable description of the method, shown under the numbers. */
  method: string;
  suggestedStartPrice: number; // paise
  estimatedLow: number;
  estimatedHigh: number;
  suggestedReserve: number;
  suggestedIncrement: number;
  /** 0-1. Low when there is little comparable history. */
  confidence: number;
  sampleSize: number;
  comparables: Array<{ title: string; finalPrice: number; endedAt: string | null }>;
  notes: string[];
}

export interface PriceEstimator {
  estimate(request: PriceEstimateRequest): Promise<PriceEstimateResult>;
}
