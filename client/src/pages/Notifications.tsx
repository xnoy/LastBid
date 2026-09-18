import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Gavel, Package, Radio, Timer, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { EmptyState, Skeleton } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/shared/types';

const ICONS: Record<string, typeof Bell> = {
  OUTBID: Gavel,
  AUCTION_WON: Trophy,
  AUCTION_LOST: Gavel,
  AUCTION_ENDING: Timer,
  AUCTION_SOLD: Trophy,
  RESERVE_MET: Gavel,
  ORDER_UPDATE: Package,
  LIVE_STARTED: Radio,
};

const TONES: Record<string, string> = {
  OUTBID: 'bg-urgent/12 text-urgent',
  AUCTION_WON: 'bg-win/12 text-win',
  AUCTION_SOLD: 'bg-win/12 text-win',
  AUCTION_ENDING: 'bg-gold/12 text-gold',
  LIVE_STARTED: 'bg-urgent/12 text-urgent',
};

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api<{ items: AppNotification[]; unread: number }>('/notifications'),
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api<{ ok: true }>('/notifications/read', { method: 'POST', json: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  // Opening the page is the acknowledgement; the badge clears on arrival.
  const unread = data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) markRead.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread > 0]);

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="hint mt-1">Outbids, endings, results and delivery updates.</p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing to catch up on"
          body="Once you bid or list something, updates land here — and arrive live while you have BidNova open."
          action={{ label: 'Find an auction', to: '/marketplace' }}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = ICONS[item.type] ?? Bell;
            return (
              <li
                key={item.id}
                className={clsx('card flex gap-3 p-4', !item.read && 'border-bid/40 bg-bid/[0.04]')}
              >
                <span
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    TONES[item.type] ?? 'bg-raised text-muted',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="hint mt-0.5">{item.body}</p>
                  <p className="hint mt-1 text-xs">{timeAgo(item.createdAt)}</p>
                </div>

                {item.auctionId ? (
                  <Link to={`/auction/${item.auctionId}`} className="btn-quiet shrink-0 self-center">
                    Open
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
