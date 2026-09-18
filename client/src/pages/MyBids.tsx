import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Countdown } from '@/components/Countdown';
import { EmptyState, Skeleton } from '@/components/ui';
import { formatINR, timeAgo } from '@/lib/format';
import type { AuctionStatus } from '@/shared/types';

interface MyBidRow {
  auction: {
    id: string;
    slug: string;
    title: string;
    images: string[];
    currentBid: number;
    endsAt: string;
    status: AuctionStatus;
    winnerId: string | null;
    bidCount: number;
    minIncrement: number;
  };
  yourBid: number;
  isAuto: boolean;
  placedAt: string;
  isWinning: boolean;
  outcome: 'winning' | 'outbid' | 'won' | 'lost';
}

const OUTCOME: Record<MyBidRow['outcome'], { label: string; className: string }> = {
  winning: { label: 'Winning', className: 'bg-win/12 text-win' },
  outbid: { label: 'Outbid', className: 'bg-urgent/12 text-urgent' },
  won: { label: 'Won', className: 'bg-bid/12 text-bid' },
  lost: { label: 'Not won', className: 'bg-raised text-muted' },
};

type Filter = 'all' | 'live' | 'won';

export default function MyBids() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.myBids,
    queryFn: () => api<{ items: MyBidRow[] }>('/bids/mine'),
  });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (filter === 'live') return items.filter((i) => i.auction.status === 'ACTIVE');
    if (filter === 'won') return items.filter((i) => i.outcome === 'won');
    return items;
  }, [data, filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">My bids</h1>
        <p className="hint mt-1">
          One row per auction, showing the highest bid you have placed on it. Your maximum auto-bid
          limits stay private and are never listed here for anyone else to see.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        {(['all', 'live', 'won'] as Filter[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              'pill border capitalize transition-colors',
              filter === key ? 'border-bid bg-bid/12 text-bid' : 'border-line text-muted hover:text-ink',
            )}
          >
            {key === 'all' ? 'Everything' : key === 'live' ? 'Still running' : 'Won'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No bids yet"
          body="Auctions you bid on appear here so you can track whether you are still ahead."
          action={{ label: 'Find something to bid on', to: '/marketplace' }}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const outcome = OUTCOME[row.outcome];
            return (
              <li key={row.auction.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link to={`/auction/${row.auction.slug}`} className="shrink-0">
                  <img src={row.auction.images[0]} alt="" className="h-20 w-20 rounded-xl object-cover" loading="lazy" />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('pill', outcome.className)}>
                      {row.outcome === 'won' ? <Trophy className="mr-1 inline h-3 w-3" aria-hidden /> : null}
                      {outcome.label}
                    </span>
                    {row.isAuto ? (
                      <span className="pill bg-raised text-muted">
                        <Bot className="mr-1 inline h-3 w-3" aria-hidden /> Auto-bid
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to={`/auction/${row.auction.slug}`}
                    className="mt-1.5 block truncate font-display font-semibold hover:text-bid"
                  >
                    {row.auction.title}
                  </Link>
                  <p className="hint mt-0.5">
                    Your bid {timeAgo(row.placedAt)} ·{' '}
                    {row.auction.status === 'ACTIVE' ? (
                      <>ends in <Countdown endsAt={row.auction.endsAt} className="inline" /></>
                    ) : (
                      'auction closed'
                    )}
                  </p>
                </div>

                <div className="flex gap-6 sm:text-right">
                  <div>
                    <p className="hint">Your bid</p>
                    <p className="tabular font-display font-semibold">{formatINR(row.yourBid)}</p>
                  </div>
                  <div>
                    <p className="hint">Current</p>
                    <p
                      className={clsx(
                        'tabular font-display font-semibold',
                        row.isWinning ? 'text-win' : 'text-ink',
                      )}
                    >
                      {formatINR(row.auction.currentBid)}
                    </p>
                  </div>
                </div>

                {row.outcome === 'won' ? (
                  <Link to="/orders" className="btn-quiet shrink-0">View order</Link>
                ) : row.outcome === 'outbid' ? (
                  <Link to={`/auction/${row.auction.slug}`} className="btn-quiet shrink-0">Bid again</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
