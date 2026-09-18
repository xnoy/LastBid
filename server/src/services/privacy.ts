import crypto from 'node:crypto';

/**
 * Bid history is public, bidder identity is not. Each user gets a stable alias
 * *per auction*, so you can follow a rivalry within one listing without being
 * able to track anyone across the marketplace.
 */
export function bidderAlias(auctionId: string, userId: string): string {
  const digest = crypto.createHash('sha256').update(`${auctionId}:${userId}`).digest('hex');
  return `bidder_${digest.slice(0, 6)}`;
}
