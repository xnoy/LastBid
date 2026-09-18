import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Radio, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Countdown } from '@/components/Countdown';
import { Avatar, EmptyState, Skeleton } from '@/components/ui';
import { formatINR } from '@/lib/format';
import type { LiveSession } from '@/shared/types';

export default function LiveIndex() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.live,
    queryFn: () => api<{ items: LiveSession[] }>('/live'),
    staleTime: 15_000,
  });

  const sessions = data?.items ?? [];
  const liveNow = sessions.filter((s) => s.status === 'LIVE');
  const upcoming = sessions.filter((s) => s.status !== 'LIVE');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">BidTok Live</h1>
        <p className="hint mt-1 max-w-2xl">
          Sellers running a lot in real time, with chat and a shared countdown. Bids placed in a live
          room go through exactly the same validation as everywhere else.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="aspect-video w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No rooms open right now"
          body="When a seller goes live, the room appears here. You can start one from any of your running auctions."
          action={{ label: 'My auctions', to: '/my-auctions' }}
        />
      ) : (
        <>
          {liveNow.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveNow.map((session) => <SessionCard key={session.id} session={session} />)}
            </div>
          ) : null}

          {upcoming.length > 0 ? (
            <section className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold">Scheduled</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((session) => <SessionCard key={session.id} session={session} />)}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: LiveSession }) {
  const price = session.auction.currentBid > 0 ? session.auction.currentBid : session.auction.startPrice;

  return (
    <Link to={`/live/${session.id}`} className="card group overflow-hidden transition-shadow hover:shadow-lift">
      <div className="relative aspect-video overflow-hidden bg-raised">
        <img
          src={session.thumbnailUrl ?? session.auction.images[0]}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {session.status === 'LIVE' ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-urgent px-2.5 py-1 text-xs font-semibold text-white">
            <Radio className="h-3 w-3" aria-hidden /> LIVE
          </span>
        ) : (
          <span className="absolute left-3 top-3 pill bg-black/60 text-white">Scheduled</span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
          <Eye className="h-3 w-3" aria-hidden /> {session.viewerCount}
        </span>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="truncate font-display font-semibold">{session.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Avatar src={session.host.avatarUrl} name={session.host.displayName} size={24} />
          <span className="truncate">{session.host.displayName}</span>
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="hint">Current bid</p>
            <p className="tabular font-display text-lg font-semibold">{formatINR(price)}</p>
          </div>
          <Countdown endsAt={session.auction.endsAt} />
        </div>
      </div>
    </Link>
  );
}
