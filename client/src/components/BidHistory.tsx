import clsx from 'clsx';
import { Bot, User } from 'lucide-react';
import { formatINR, timeAgo } from '@/lib/format';
import type { BidRecord } from '@/shared/types';

/**
 * Bid history. Bidders appear as per-auction aliases, never as usernames, so
 * the rivalry is legible without exposing who anyone is. Nobody's maximum is
 * shown here — only the amounts that were actually bid.
 */
export function BidHistory({ bids, limit }: { bids: BidRecord[]; limit?: number }) {
  const rows = limit ? bids.slice(0, limit) : bids;

  if (rows.length === 0) {
    return <p className="hint py-6 text-center">No bids yet. The first one sets the pace.</p>;
  }

  return (
    <ol className="divide-y divide-line">
      {rows.map((bid, index) => (
        <li key={bid.id} className="flex items-center gap-3 py-2.5">
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              index === 0 ? 'bg-win/12 text-win' : 'bg-raised text-muted',
            )}
          >
            {bid.isAuto ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {bid.isYou ? 'You' : bid.alias}
              {bid.isAuto ? <span className="ml-2 text-xs font-normal text-muted">automatic</span> : null}
            </p>
            <p className="text-xs text-muted">{timeAgo(bid.createdAt)}</p>
          </div>

          <span className={clsx('tabular font-display font-semibold', index === 0 && 'text-win')}>
            {formatINR(bid.amount)}
          </span>
        </li>
      ))}
    </ol>
  );
}
