import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Skeleton, StatusPill } from '@/components/ui';
import { formatDateTime, formatINR } from '@/lib/format';
import { useToast } from '@/store/ToastContext';
import type { AuctionStatus } from '@/shared/types';

interface Overview {
  users: number;
  activeAuctions: number;
  soldAuctions: number;
  bids: number;
  orders: number;
  liveNow: number;
  grossMerchandiseValue: number;
  redisTrackedAuctions: number;
}

interface AdminAuction {
  id: string;
  title: string;
  status: AuctionStatus;
  currentBid: number;
  bidCount: number;
  endsAt: string;
  createdAt: string;
  seller: { username: string };
}

const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'UNSOLD', label: 'Unsold' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminDashboard() {
  const [status, setStatus] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const overview = useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: () => api<Overview>('/admin/overview'),
  });

  const auctions = useQuery({
    queryKey: queryKeys.adminAuctions(status),
    queryFn: () => api<{ items: AdminAuction[] }>(`/admin/auctions${status ? `?status=${status}` : ''}`),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'settle' | 'cancel' }) =>
      api<{ ok: true }>(`/admin/auctions/${id}/${action}`, { method: 'POST' }),
    onSuccess: (_data, variables) => {
      toast({ tone: 'success', title: variables.action === 'settle' ? 'Auction settled' : 'Auction cancelled' });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toast({ tone: 'error', title: 'That failed', body: (err as ApiError).message }),
  });

  const stats: Array<{ label: string; value: string; note?: string }> = overview.data
    ? [
        { label: 'Accounts', value: String(overview.data.users) },
        { label: 'Live auctions', value: String(overview.data.activeAuctions) },
        { label: 'Sold', value: String(overview.data.soldAuctions) },
        { label: 'Bids placed', value: String(overview.data.bids) },
        { label: 'Orders', value: String(overview.data.orders) },
        { label: 'Rooms live now', value: String(overview.data.liveNow) },
        { label: 'Order value', value: formatINR(overview.data.grossMerchandiseValue, { compact: true }) },
        {
          label: 'In the Redis index',
          value: String(overview.data.redisTrackedAuctions),
          note: 'Should match live auctions',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="hint mt-1">
          Every number here is a live count from the database — nothing on this page is illustrative.
        </p>
      </header>

      {overview.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="hint">{stat.label}</p>
              <p className="tabular font-display text-2xl font-semibold">{stat.value}</p>
              {stat.note ? <p className="hint mt-0.5 text-xs">{stat.note}</p> : null}
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Recent auctions</h2>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || 'all'}
                onClick={() => setStatus(filter.value)}
                className={clsx(
                  'pill border transition-colors',
                  status === filter.value ? 'border-bid bg-bid/12 text-bid' : 'border-line text-muted hover:text-ink',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {auctions.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium">Seller</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Bids</th>
                  <th className="p-3 text-right font-medium">Current</th>
                  <th className="p-3 font-medium">Ends</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(auctions.data?.items ?? []).map((auction) => (
                  <tr key={auction.id}>
                    <td className="max-w-xs truncate p-3 font-medium">{auction.title}</td>
                    <td className="p-3 text-muted">
                      <Link to={`/seller/${auction.seller.username}`} className="hover:text-ink">
                        @{auction.seller.username}
                      </Link>
                    </td>
                    <td className="p-3"><StatusPill status={auction.status} /></td>
                    <td className="tabular p-3 text-right">{auction.bidCount}</td>
                    <td className="tabular p-3 text-right">{formatINR(auction.currentBid)}</td>
                    <td className="p-3 text-muted">{formatDateTime(auction.endsAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {auction.status === 'ACTIVE' ? (
                          <>
                            <button
                              onClick={() => act.mutate({ id: auction.id, action: 'settle' })}
                              disabled={act.isPending}
                              className="btn-quiet"
                            >
                              Settle
                            </button>
                            <button
                              onClick={() => act.mutate({ id: auction.id, action: 'cancel' })}
                              disabled={act.isPending}
                              className="btn-quiet text-urgent"
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="hint mt-4">
          Force-settling is idempotent: the Lua close script flips an auction out of ACTIVE exactly
          once, so pressing it twice cannot create two winners.
        </p>
      </section>
    </div>
  );
}
