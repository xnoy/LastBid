import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { AuctionCard } from '@/components/AuctionCard';
import { Avatar, CardSkeletonGrid, EmptyState, SectionHeading } from '@/components/ui';
import { useWatchlistIds } from '@/hooks/useWatchlist';
import { formatDate } from '@/lib/format';
import type { AuctionCard as AuctionCardType, PublicUser } from '@/shared/types';

interface SellerResponse {
  user: PublicUser;
  active: AuctionCardType[];
  sold: AuctionCardType[];
}

export default function SellerProfile() {
  const { username = '' } = useParams();
  const watching = useWatchlistIds();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.seller(username),
    queryFn: () => api<SellerResponse>(`/users/${username}`),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <CardSkeletonGrid count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">No seller by that name</h1>
        <Link to="/marketplace" className="btn-primary mt-5">Back to the marketplace</Link>
      </div>
    );
  }

  const { user, active, sold } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="card mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar src={user.avatarUrl} name={user.displayName} size={72} />

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{user.displayName}</h1>
          <p className="hint">@{user.username}</p>
          {user.bio ? <p className="mt-2 max-w-xl text-sm text-muted">{user.bio}</p> : null}

          <div className="hint mt-3 flex flex-wrap items-center gap-4">
            {user.ratingCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                <span className="tabular font-medium text-ink">{user.ratingAvg.toFixed(1)}</span>
                from {user.ratingCount} sales
              </span>
            ) : (
              <span>No sales rated yet</span>
            )}
            {user.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {user.location}
              </span>
            ) : null}
            {user.createdAt ? <span>Selling since {formatDate(user.createdAt)}</span> : null}
          </div>
        </div>
      </header>

      <section className="mb-12">
        <SectionHeading
          title="Live auctions"
          description={active.length ? `${active.length} lot${active.length === 1 ? '' : 's'} running now` : undefined}
        />
        {active.length === 0 ? (
          <EmptyState
            title="Nothing running right now"
            body={`${user.displayName} has no live lots at the moment. Completed sales are below.`}
            action={{ label: 'Browse everything', to: '/marketplace' }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {active.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} watching={watching.has(auction.id)} />
            ))}
          </div>
        )}
      </section>

      {sold.length > 0 ? (
        <section>
          <SectionHeading title="Recently sold" description="Completed sales stay on record here." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {sold.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} watching={watching.has(auction.id)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
