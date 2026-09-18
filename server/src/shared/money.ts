/**
 * Every monetary value in BidNova is an integer count of paise (1/100 rupee).
 * Floats never touch a price: ₹5,000.50 is 500050, full stop.
 */
export const PAISE = 100;

export function toPaise(rupees: number): number {
  return Math.round(rupees * PAISE);
}

export function toRupees(paise: number): number {
  return paise / PAISE;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / PAISE);
}

/**
 * The smallest bid the server will accept next.
 * First bid may equal the start price; after that it must clear the increment.
 */
export function minimumNextBid(currentBid: number, startPrice: number, increment: number): number {
  return currentBid === 0 ? startPrice : currentBid + increment;
}
