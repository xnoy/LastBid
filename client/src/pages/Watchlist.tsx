import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { AuctionCard } from '@/components/AuctionCard';
import { CardSkeletonGrid, EmptyState } from '@/components/ui';
import type { AuctionCard as AuctionCardType } from '@/shared/types';

export default function Watchlist() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: () => api<{ items: AuctionCardType[] }>('/watchlist'),
  });

  const items = data?.items ?? [];
  const endingSoon = items.filter(
    (item) => item.status === 'ACTIVE' && new Date(item.endsAt).getTime() - Date.now() < 6 * 3600_000,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Watchlist</h1>
        <p className="hint mt-1">
          {endingSoon.length > 0
            ? `${endingSoon.length} of these ${endingSoon.length === 1 ? 'ends' : 'end'} within six hours.`
            : 'Saved lots, with their live prices and countdowns.'}
        </p>
      </header>

      {isLoading ? (
        <CardSkeletonGrid count={8} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Tap the heart on any auction to keep an eye on it. Saved lots keep counting down here."
          action={{ label: 'Browse the marketplace', to: '/marketplace' }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} watching />
          ))}
        </div>
      )}
    </div>
  );
}
