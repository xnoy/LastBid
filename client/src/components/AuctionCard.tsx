import { Link } from 'react-router-dom';
import { Heart, Gavel, Radio, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Countdown } from './Countdown';
import { Avatar } from './ui';
import { formatINR, CONDITION_LABELS } from '@/lib/format';
import { useToggleWatch } from '@/hooks/useWatchlist';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/store/ToastContext';
import type { AuctionCard as AuctionCardType } from '@/shared/types';

interface Props {
  auction: AuctionCardType;
  watching?: boolean;
  isLive?: boolean;
  /** Cards inside a horizontal rail get a fixed width. */
  fixedWidth?: boolean;
}

export function AuctionCard({ auction, watching = false, isLive = false, fixedWidth = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const toggle = useToggleWatch();
  const isLuxury = auction.category === 'collectibles' || auction.subcategory === 'antiques';

  const price = auction.currentBid > 0 ? auction.currentBid : auction.startPrice;
  const priceLabel = auction.currentBid > 0 ? 'Current bid' : 'Starting bid';

  const onWatch = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!user) {
      toast({ tone: 'info', title: 'Sign in to save auctions', body: 'Your watchlist follows you across devices.' });
      return;
    }
    toggle.mutate({ auctionId: auction.id, watching });
  };

  return (
    <article
      className={clsx(
        'card group relative overflow-hidden transition-all duration-300',
        isLuxury
          ? 'border-[#FFB800]/30 hover:border-[#FFB800] hover:shadow-[0_0_25px_rgba(255,184,0,0.3)]'
          : auction.category === 'tech'
            ? 'hover:border-[#A855F7] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]'
            : auction.category === 'entertainment'
              ? 'hover:border-[#00F0FF] hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]'
              : 'hover:border-[#10B981] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]',
        fixedWidth && 'w-[16.5rem] shrink-0',
      )}
    >
      <Link to={`/auction/${auction.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-raised">
          <img
            src={auction.images[0]}
            alt={auction.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 p-3">
            <span className="pill bg-black/60 text-white backdrop-blur-md">
              <Countdown endsAt={auction.endsAt} className="text-white" />
            </span>
            {isLuxury ? (
              <span className="pill border border-[#FFB800]/60 bg-black/75 text-[#FFB800] backdrop-blur-md font-semibold text-[0.65rem] tracking-wider shadow-[0_0_10px_rgba(255,184,0,0.3)]">
                <Sparkles className="h-3 w-3 inline text-[#FFB800]" /> LUXURY
              </span>
            ) : isLive ? (
              <span className="pill bg-urgent text-white">
                <Radio className="h-3 w-3" /> Live
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <button
        onClick={onWatch}
        aria-label={watching ? 'Remove from watchlist' : 'Save to watchlist'}
        aria-pressed={watching}
        className="absolute right-3 top-14 rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/80"
      >
        <Heart className={clsx('h-4 w-4', watching && 'fill-urgent text-urgent')} />
      </button>

      <div className="space-y-3 p-4">
        {/* Explicit Category Tag */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={clsx(
              'pill text-[0.65rem] font-bold uppercase tracking-wider py-0.5 px-2 border',
              auction.category === 'fashion'
                ? 'border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]'
                : auction.category === 'tech'
                  ? 'border-[#A855F7]/50 bg-[#A855F7]/15 text-[#A855F7]'
                  : auction.category === 'entertainment'
                    ? 'border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF]'
                    : 'border-[#FFB800]/50 bg-[#FFB800]/15 text-[#FFB800]',
            )}
          >
            {auction.category === 'fashion'
              ? '👟 Fashion'
              : auction.category === 'tech'
                ? '🎮 Exclusive Tech'
                : auction.category === 'entertainment'
                  ? '🎶 Entertainment'
                  : '🃏 Collectible'}
          </span>
          {auction.subcategory && (
            <span className="text-[0.68rem] text-muted capitalize font-medium">
              • {auction.subcategory.replace(/-/g, ' ')}
            </span>
          )}
        </div>

        <Link to={`/auction/${auction.slug}`}>
          <h3
            className={clsx(
              'line-clamp-2 font-medium leading-snug transition-colors',
              isLuxury ? 'hover:text-[#FFB800]' : 'hover:text-bid',
            )}
          >
            {auction.title}
          </h3>
        </Link>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted">{priceLabel}</p>
            <p
              className={clsx(
                'tabular font-display text-lg font-bold leading-tight',
                isLuxury ? 'text-[#FFB800] glow-text-gold' : 'text-ink',
              )}
            >
              {formatINR(price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</p>
            {auction.hasReserve ? (
              <p className={clsx('text-xs font-medium', auction.reserveMet ? 'text-win' : 'text-muted')}>
                {auction.reserveMet ? 'Reserve met' : 'Reserve not met'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <Link
            to={`/seller/${auction.seller.username}`}
            className="flex min-w-0 items-center gap-2 text-xs text-muted hover:text-ink"
          >
            <Avatar src={auction.seller.avatarUrl} name={auction.seller.displayName} size={22} />
            <span className="truncate">{auction.seller.displayName}</span>
          </Link>
          <span className="shrink-0 text-xs text-muted">{CONDITION_LABELS[auction.condition]}</span>
        </div>
      </div>

      <Link
        to={`/auction/${auction.slug}`}
        className={clsx(
          'flex items-center justify-center gap-2 border-t border-line bg-raised/60 py-2.5 text-sm font-semibold transition-all duration-200',
          isLuxury
            ? 'text-[#FFB800] hover:bg-[#FFB800] hover:text-black hover:shadow-[0_0_20px_rgba(255,184,0,0.5)]'
            : auction.category === 'tech'
              ? 'text-[#A855F7] hover:bg-[#A855F7] hover:text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
              : auction.category === 'entertainment'
                ? 'text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                : 'text-bid hover:bg-bid hover:text-white',
        )}
      >
        <Gavel className="h-4 w-4" /> Place a bid
      </Link>
    </article>
  );
}
