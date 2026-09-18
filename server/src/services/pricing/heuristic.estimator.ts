import { prisma } from '../../lib/prisma';
import type { PriceEstimator, PriceEstimateRequest, PriceEstimateResult } from './types';

/**
 * Statistics over BidNova's own completed sales. Not a machine-learning model,
 * and the UI says so: it reads the closing prices of comparable sold auctions
 * in the same subcategory and condition band, then reports the interquartile
 * range. With fewer than four comparables it falls back to the subcategory as
 * a whole and lowers the reported confidence.
 */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? Math.round(sorted[base] + rest * (next - sorted[base])) : sorted[base];
}

/** Round to a clean number so sellers see ₹12,500 rather than ₹12,483. */
function roundToNice(paise: number): number {
  if (paise <= 0) return 0;
  const rupees = paise / 100;
  const magnitude = Math.pow(10, Math.max(1, Math.floor(Math.log10(rupees)) - 1));
  return Math.round(Math.round(rupees / magnitude) * magnitude) * 100;
}

export class HeuristicPriceEstimator implements PriceEstimator {
  async estimate(request: PriceEstimateRequest): Promise<PriceEstimateResult> {
    const notes: string[] = [];

    let comparables = await prisma.auction.findMany({
      where: {
        status: 'SOLD',
        subcategory: request.subcategory,
        condition: request.condition as never,
      },
      select: { title: true, currentBid: true, endedAt: true },
      orderBy: { endedAt: 'desc' },
      take: 60,
    });

    if (comparables.length < 4) {
      notes.push('Too few sales in this exact condition, so the whole subcategory was used.');
      comparables = await prisma.auction.findMany({
        where: { status: 'SOLD', subcategory: request.subcategory },
        select: { title: true, currentBid: true, endedAt: true },
        orderBy: { endedAt: 'desc' },
        take: 60,
      });
    }

    if (comparables.length === 0) {
      notes.push('No completed sales to compare against yet. Set a price you would be happy with.');
      return {
        provider: 'heuristic',
        method: 'No comparable sales found',
        suggestedStartPrice: 0,
        estimatedLow: 0,
        estimatedHigh: 0,
        suggestedReserve: 0,
        suggestedIncrement: 10_000,
        confidence: 0,
        sampleSize: 0,
        comparables: [],
        notes,
      };
    }

    const prices = comparables.map((c) => c.currentBid).sort((a, b) => a - b);
    const low = quantile(prices, 0.25);
    const median = quantile(prices, 0.5);
    const high = quantile(prices, 0.75);

    // Opening low draws more bidders; a starting price near the 25th percentile
    // is the pattern that historically produces the most bids per listing.
    const suggestedStartPrice = roundToNice(Math.max(low * 0.6, prices[0] * 0.5));
    const suggestedReserve = roundToNice(median * 0.85);
    const suggestedIncrement = roundToNice(Math.max(median * 0.02, 5_000));

    // More samples and a tighter spread both raise confidence.
    const spread = high > 0 ? (high - low) / high : 1;
    const confidence = Math.max(
      0.15,
      Math.min(0.95, (Math.min(prices.length, 25) / 25) * 0.7 + (1 - Math.min(spread, 1)) * 0.3),
    );

    if (prices.length < 8) notes.push('Based on a small sample, so treat the range as indicative.');

    return {
      provider: 'heuristic',
      method: `Interquartile range of ${prices.length} completed BidNova sales in ${request.subcategory}`,
      suggestedStartPrice,
      estimatedLow: low,
      estimatedHigh: high,
      suggestedReserve,
      suggestedIncrement,
      confidence: Number(confidence.toFixed(2)),
      sampleSize: prices.length,
      comparables: comparables.slice(0, 5).map((c) => ({
        title: c.title,
        finalPrice: c.currentBid,
        endedAt: c.endedAt ? c.endedAt.toISOString() : null,
      })),
      notes,
    };
  }
}
