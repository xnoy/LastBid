/** Amounts travel as integer paise; they are only ever formatted here. */
export const PAISE = 100;

export function toPaise(rupees: number): number {
  return Math.round(rupees * PAISE);
}

export function toRupees(paise: number): number {
  return paise / PAISE;
}

export function formatINR(paise: number, options?: { compact?: boolean }): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: options?.compact ? 'compact' : 'standard',
  }).format(paise / PAISE);
}

/** Bare number for input fields, no currency symbol. */
export function rupeeInput(paise: number): string {
  return String(Math.round(paise / PAISE));
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

export function timeAgo(value: string | Date): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like new',
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  FOR_PARTS: 'For parts',
};

/** Splits a remaining duration into the parts the countdown renders. */
export function splitDuration(ms: number): { d: number; h: number; m: number; s: number } {
  const clamped = Math.max(0, ms);
  return {
    d: Math.floor(clamped / 86_400_000),
    h: Math.floor((clamped % 86_400_000) / 3_600_000),
    m: Math.floor((clamped % 3_600_000) / 60_000),
    s: Math.floor((clamped % 60_000) / 1000),
  };
}
