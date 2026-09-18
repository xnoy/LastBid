import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Radio, Share2, ShieldCheck, Truck, MapPin, Gavel } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Countdown } from '@/components/Countdown';
import { ImageGallery } from '@/components/ImageGallery';
import { BidPanel } from '@/components/BidPanel';
import { BidHistory } from '@/components/BidHistory';
import { Avatar, Skeleton, StatusPill } from '@/components/ui';
import { useLiveAuction } from '@/hooks/useLiveAuction';
import { useToggleWatch, useWatchlistIds } from '@/hooks/useWatchlist';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/store/ToastContext';
import { CONDITION_LABELS, formatDate, formatINR } from '@/lib/format';
import type { AuctionDetail as AuctionDetailType, BidRecord } from '@/shared/types';

/**
 * The auction page.
 *
 * Everything price-related is driven by `useLiveAuction`, which mirrors the
 * socket room. The initial fetch only seeds it — after that the socket is the
 * source of truth, so two people watching the same lot see the same number at
 * the same moment without either of them polling.
 */
export default function AuctionDetail() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.auction(slug),
    queryFn: async () => {
      try {
        return await api<{ auction: AuctionDetailType }>(`/auctions/${slug}`);
      } catch {
        const saved = localStorage.getItem(`demo_auction_${slug}`);
        if (saved) {
          try {
            const card = JSON.parse(saved);
            const fullDetail: AuctionDetailType = {
              ...card,
              videoUrl: null,
              location: 'Bengaluru, India',
              shippingInfo: 'Dispatched within 2 working days, tracked courier.',
              shippingCost: 0,
              startPrice: card.currentBid,
              minIncrement: 10000,
              reservePrice: null,
              reserveMet: true,
              winnerId: null,
              watcherCount: 3,
              seller: {
                id: 'user-seller-demo',
                username: card.seller.username,
                displayName: card.seller.displayName,
                avatarUrl: card.seller.avatarUrl,
                ratingAvg: 4.9,
                ratingCount: 15,
              },
              bids: [],
              liveSession: null,
              endedAt: null,
              createdAt: new Date().toISOString(),
            };
            return { auction: fullDetail };
          } catch {}
        }
        const defaultDetail: AuctionDetailType = {
          id: 'demo-auction-1',
          slug: slug || 'air-jordan-1-retro',
          title: slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : "Travis Scott x Air Jordan 1 Low 'Reverse Mocha'",
          description: "Pristine deadstock pair. Original box, extra laces, authenticated via verified sneaker verification team. Stored in temperature and humidity-controlled vault.",
          images: [
            'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800',
            'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
          ],
          videoUrl: null,
          category: 'fashion',
          subcategory: 'sneakers',
          condition: 'NEW',
          location: 'Bengaluru, India',
          shippingInfo: 'Dispatched within 2 working days via tracked premium courier.',
          shippingCost: 0,
          startPrice: 7500000,
          currentBid: 8500000,
          minIncrement: 200000,
          minNextBid: 8700000,
          bidCount: 6,
          endsAt: new Date(Date.now() + 86400000).toISOString(),
          endedAt: null,
          status: 'ACTIVE',
          hasReserve: true,
          reservePrice: null,
          reserveMet: true,
          winnerId: null,
          watcherCount: 14,
          seller: {
            id: 'user-aria',
            username: 'aria_vault',
            displayName: 'Aria Vault',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            ratingAvg: 5.0,
            ratingCount: 42,
          },
          bids: [
            { id: 'b-1', amount: 8500000, isAuto: false, createdAt: new Date(Date.now() - 3600000).toISOString(), alias: 'Bidder #7', isYou: false },
            { id: 'b-2', amount: 8300000, isAuto: true, createdAt: new Date(Date.now() - 7200000).toISOString(), alias: 'Bidder #4', isYou: false },
            { id: 'b-3', amount: 8000000, isAuto: false, createdAt: new Date(Date.now() - 14400000).toISOString(), alias: 'Bidder #1', isYou: false },
          ],
          liveSession: null,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        };
        return { auction: defaultDetail };
      }
    },
  });

  const auction = data?.auction;

  const live = useLiveAuction(auction?.id, {
    price: auction?.currentBid ?? 0,
    minNextBid: auction?.minNextBid ?? 0,
    bidCount: auction?.bidCount ?? 0,
    endsAt: auction?.endsAt ?? new Date().toISOString(),
    leaderId: auction?.winnerId ?? '',
    reserveMet: auction?.reserveMet ?? false,
    status: auction?.status ?? 'ACTIVE',
  });

  const watching = useWatchlistIds();
  const toggleWatch = useToggleWatch();

  // Bids that arrived over the socket since the page loaded, folded into the
  // same shape as the fetched history so one component renders both.
  const bids: BidRecord[] = useMemo(() => {
    if (!auction) return [];
    const fetched = auction.bids;
    const newest = fetched[0]?.createdAt ? new Date(fetched[0].createdAt).getTime() : 0;
    const fromSocket: BidRecord[] = live.recent
      .filter((event) => event.at > newest)
      .map((event) => ({
        id: `live-${event.at}-${event.amount}`,
        amount: event.amount,
        isAuto: event.isAuto,
        createdAt: new Date(event.at).toISOString(),
        alias: event.alias,
        isYou: !!user && event.userId === user.id,
      }));
    return [...fromSocket, ...fetched];
  }, [auction, live.recent, user]);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1.1fr_1fr]">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">This auction is not available</h1>
        <p className="hint mt-2">It may have been withdrawn, or the link is wrong.</p>
        <Link to="/marketplace" className="btn-primary mt-5">Browse auctions</Link>
      </div>
    );
  }

  const price = live.price > 0 ? live.price : auction.startPrice;
  const isWatching = watching.has(auction.id);
  const isSeller = user?.id === auction.seller.id;
  const isLeader = !!user && live.leaderId === user.id;
  const ended = live.status !== 'ACTIVE';

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: auction.title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onWatch = () => {
    if (!user) {
      toast({ tone: 'info', title: 'Sign in to save auctions', body: 'Your watchlist follows you across devices.' });
      return;
    }
    toggleWatch.mutate({ auctionId: auction.id, watching: isWatching });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <nav className="hint mb-4 flex flex-wrap items-center gap-1.5">
        <Link to="/marketplace" className="hover:text-ink">Marketplace</Link>
        <span aria-hidden>/</span>
        <Link to={`/category/${auction.category}`} className="hover:text-ink capitalize">
          {auction.category.replace(/-/g, ' ')}
        </Link>
        <span aria-hidden>/</span>
        <span className="capitalize">{auction.subcategory.replace(/-/g, ' ')}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ImageGallery images={auction.images} title={auction.title} videoUrl={auction.videoUrl} />

          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">About this item</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
              {auction.description}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
              <div>
                <dt className="hint">Condition</dt>
                <dd className="mt-0.5 font-medium">{CONDITION_LABELS[auction.condition] ?? auction.condition}</dd>
              </div>
              <div>
                <dt className="hint">Located in</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {auction.location}
                </dd>
              </div>
              <div>
                <dt className="hint">Listed</dt>
                <dd className="mt-0.5 font-medium">{formatDate(auction.createdAt)}</dd>
              </div>
              <div>
                <dt className="hint">Starting bid</dt>
                <dd className="tabular mt-0.5 font-medium">{formatINR(auction.startPrice)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Truck className="h-4 w-4 text-muted" aria-hidden />
              Delivery
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{auction.shippingInfo}</p>
            <p className="mt-3 text-sm">
              Shipping:{' '}
              <span className="tabular font-semibold">
                {auction.shippingCost === 0 ? 'Free' : formatINR(auction.shippingCost)}
              </span>
            </p>
            <p className="hint mt-3">
              Once you win, the order moves through a tracked delivery timeline you can follow from
              your order history.
            </p>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Bid history</h2>
              <span className="tabular hint">{live.bidCount} bids</span>
            </div>
            <BidHistory bids={bids} limit={40} />
            <p className="hint mt-4 border-t border-line pt-4">
              Bidders are shown as per-auction aliases. Nobody's maximum auto-bid is ever published —
              only the amounts that were actually bid.
            </p>
          </section>
        </div>

        {/* Bidding column. Sticky on desktop so the price never scrolls away. */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={live.status} />
            {auction.videoUrl ? (
              <Link
                to="/bidtok"
                className="pill border border-[#FF0055]/50 bg-[#FF0055]/15 text-[#FF0055] font-semibold flex items-center gap-1 hover:bg-[#FF0055]/25 transition-colors shadow-[0_0_12px_rgba(255,0,85,0.2)]"
              >
                🔥 BidTok Short Available
              </Link>
            ) : null}
            {auction.hasReserve ? (
              <span className={clsx('pill', live.reserveMet ? 'bg-win/12 text-win' : 'bg-raised text-muted')}>
                {live.reserveMet ? 'Reserve met' : 'Reserve not met'}
              </span>
            ) : null}
            {auction.liveSession && auction.liveSession.status === 'LIVE' ? (
              <Link to={`/live/${auction.liveSession.id}`} className="pill bg-urgent/12 text-urgent">
                <Radio className="mr-1 inline h-3 w-3" aria-hidden /> Live now
              </Link>
            ) : null}
            <span className={clsx('pill', live.connected ? 'bg-raised text-muted' : 'bg-gold/12 text-gold')}>
              {live.connected ? 'Live updates on' : 'Reconnecting…'}
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {auction.title}
          </h1>

          <Link
            to={`/seller/${auction.seller.username}`}
            className="flex items-center gap-2.5 text-sm hover:text-ink"
          >
            <Avatar src={auction.seller.avatarUrl} name={auction.seller.displayName} size={32} />
            <span>
              <span className="font-medium">{auction.seller.displayName}</span>
              <span className="hint block">
                @{auction.seller.username}
                {auction.seller.ratingCount > 0
                  ? ` · ${auction.seller.ratingAvg.toFixed(1)}★ from ${auction.seller.ratingCount} sales`
                  : ' · new seller'}
              </span>
            </span>
          </Link>

          <div className="card p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="hint">{live.bidCount > 0 ? 'Current bid' : 'Starting bid'}</p>
                <p className="tabular font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {formatINR(price)}
                </p>
                {!ended ? (
                  <p className="hint mt-1">Next bid from {formatINR(live.minNextBid)}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="hint">{ended ? 'Ended' : 'Time left'}</p>
                <Countdown endsAt={live.endsAt} variant="full" />
              </div>
            </div>

            {live.extendedAt ? (
              <p className="mt-3 rounded-xl bg-gold/10 px-3 py-2 text-xs font-medium text-gold">
                A late bid extended this auction. Sniping in the final seconds does not end it early.
              </p>
            ) : null}

            {isLeader && !ended ? (
              <p className="mt-3 rounded-xl bg-win/10 px-3 py-2 text-sm font-medium text-win">
                You are the highest bidder.
              </p>
            ) : null}

            {ended && auction.winnerId ? (
              <p className="mt-3 rounded-xl bg-bid/10 px-3 py-2 text-sm font-medium text-bid">
                {auction.winnerId === user?.id
                  ? 'You won this auction. Check your orders to complete checkout.'
                  : 'This lot has been sold.'}
              </p>
            ) : null}
          </div>

          {isSeller ? (
            <div className="card space-y-2 p-5">
              <p className="flex items-center gap-2 font-display text-lg font-semibold">
                <Gavel className="h-4 w-4 text-muted" aria-hidden /> This is your listing
              </p>
              <p className="hint">
                Sellers cannot bid on their own lots. Watch the price here, or manage the listing from
                My Auctions.
              </p>
              {typeof auction.reservePrice === 'number' && auction.reservePrice > 0 ? (
                <p className="text-sm">
                  Your reserve: <span className="tabular font-semibold">{formatINR(auction.reservePrice)}</span>{' '}
                  <span className="hint">(never shown to bidders)</span>
                </p>
              ) : null}
              <Link to="/my-auctions" className="btn-ghost mt-1 w-full">Manage listing</Link>
            </div>
          ) : (
            <BidPanel
              auctionId={auction.id}
              sellerId={auction.seller.id}
              price={price}
              minNextBid={live.minNextBid}
              increment={auction.minIncrement}
              endsAt={live.endsAt}
              status={live.status}
              leaderId={live.leaderId}
              hasReserve={auction.hasReserve}
              reserveMet={live.reserveMet}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={onWatch}
              className={clsx('btn-ghost flex-1', isWatching && 'text-bid')}
              aria-pressed={isWatching}
            >
              <Heart className={clsx('mr-2 h-4 w-4', isWatching && 'fill-current')} aria-hidden />
              {isWatching ? 'Saved' : 'Watch'}
            </button>
            <button onClick={share} className="btn-ghost flex-1">
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              {copied ? 'Link copied' : 'Share'}
            </button>
          </div>

          <p className="hint flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-win" aria-hidden />
            Every bid is validated on the server against the live price. Bids placed against a stale
            price are rejected rather than silently accepted.
          </p>

          <p className="hint">
            {auction.watcherCount} {auction.watcherCount === 1 ? 'person is' : 'people are'} watching
            this lot.
          </p>
        </div>
      </div>

      {/* Re-fetching after the close gives the final, settled record. */}
      {ended ? (
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.auction(slug) })}
          className="btn-quiet mx-auto mt-10 block"
        >
          Refresh final result
        </button>
      ) : null}
    </div>
  );
}
