import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Countdown } from '@/components/Countdown';
import { EmptyState, Skeleton, StatusPill } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format';
import { useToast } from '@/store/ToastContext';
import type { AuctionStatus } from '@/shared/types';

/** The seller's own view — this is the one place a reserve amount is shown. */
interface OwnAuction {
  id: string;
  slug: string;
  title: string;
  images: string[];
  status: AuctionStatus;
  startPrice: number;
  currentBid: number;
  bidCount: number;
  reservePrice: number | null;
  endsAt: string;
  endedAt: string | null;
  createdAt: string;
}

type Tab = 'live' | 'ended' | 'draft';

const TABS: Array<{ key: Tab; label: string; statuses: AuctionStatus[] }> = [
  { key: 'live', label: 'Running', statuses: ['ACTIVE', 'SCHEDULED'] },
  { key: 'ended', label: 'Finished', statuses: ['SOLD', 'UNSOLD', 'ENDED'] },
  { key: 'draft', label: 'Withdrawn', statuses: ['CANCELLED'] },
];

export default function MyAuctions() {
  const [tab, setTab] = useState<Tab>('live');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.myAuctions,
    queryFn: () => api<{ items: OwnAuction[] }>('/users/me/auctions'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/auctions/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'Listing withdrawn' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myAuctions });
    },
    onError: (err) => toast({ tone: 'error', title: 'Could not withdraw', body: (err as ApiError).message }),
  });

  const goLive = useMutation({
    mutationFn: (auction: OwnAuction) =>
      api<{ session: { id: string } }>('/live', {
        method: 'POST',
        json: { auctionId: auction.id, title: auction.title },
      }),
    onSuccess: (result) => {
      window.location.assign(`/live/${result.session.id}`);
    },
    onError: (err) => toast({ tone: 'error', title: 'Could not open a live room', body: (err as ApiError).message }),
  });

  const grouped = useMemo(() => {
    const items = data?.items ?? [];
    const active = TABS.find((t) => t.key === tab)!.statuses;
    return items.filter((item) => active.includes(item.status));
  }, [data, tab]);

  const counts = useMemo(() => {
    const items = data?.items ?? [];
    return Object.fromEntries(
      TABS.map((t) => [t.key, items.filter((i) => t.statuses.includes(i.status)).length]),
    ) as Record<Tab, number>;
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">My auctions</h1>
          <p className="hint mt-1">Everything you have listed, live and finished.</p>
        </div>
        <Link to="/sell" className="btn-primary">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> List an item
        </Link>
      </header>

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'pill border transition-colors',
              tab === t.key ? 'border-bid bg-bid/12 text-bid' : 'border-line text-muted hover:text-ink',
            )}
          >
            {t.label}
            <span className="tabular ml-1.5 opacity-70">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Listings you create show up here with their live price, bid count and reserve status."
          action={{ label: 'List your first item', to: '/sell' }}
        />
      ) : (
        <ul className="space-y-3">
          {grouped.map((auction) => {
            const reserveMet =
              !auction.reservePrice || auction.currentBid >= auction.reservePrice;

            return (
              <li key={auction.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link to={`/auction/${auction.slug}`} className="shrink-0">
                  <img
                    src={auction.images[0]}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover"
                    loading="lazy"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={auction.status} />
                    {auction.reservePrice ? (
                      <span className={clsx('pill', reserveMet ? 'bg-win/12 text-win' : 'bg-raised text-muted')}>
                        Reserve {formatINR(auction.reservePrice)} {reserveMet ? 'met' : 'not met'}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to={`/auction/${auction.slug}`}
                    className="mt-1.5 block truncate font-display font-semibold hover:text-bid"
                  >
                    {auction.title}
                  </Link>
                  <p className="hint mt-0.5">
                    {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} ·{' '}
                    {auction.status === 'ACTIVE' ? (
                      <>ends in <Countdown endsAt={auction.endsAt} className="inline" /></>
                    ) : auction.endedAt ? (
                      `ended ${formatDate(auction.endedAt)}`
                    ) : (
                      `listed ${formatDate(auction.createdAt)}`
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <p className="hint">{auction.bidCount > 0 ? 'Current bid' : 'Starting bid'}</p>
                    <p className="tabular font-display text-lg font-semibold">
                      {formatINR(auction.currentBid > 0 ? auction.currentBid : auction.startPrice)}
                    </p>
                  </div>

                  {auction.status === 'ACTIVE' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => goLive.mutate(auction)}
                        disabled={goLive.isPending}
                        className="btn-quiet"
                      >
                        <Radio className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Go live
                      </button>
                      {auction.bidCount === 0 ? (
                        <button
                          onClick={() => cancel.mutate(auction.id)}
                          disabled={cancel.isPending}
                          className="btn-quiet text-urgent"
                        >
                          Withdraw
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint mt-8">
        A listing can only be withdrawn while it has no bids. Once someone has bid, it runs to the end —
        that is what makes a bid worth placing.
      </p>
    </div>
  );
}
