import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Radio, Volume2, VolumeX, ArrowRight, Play, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Countdown } from '@/components/Countdown';
import { Avatar, EmptyState, Spinner } from '@/components/ui';
import { useToggleWatch, useWatchlistIds } from '@/hooks/useWatchlist';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/store/ToastContext';
import { formatINR } from '@/lib/format';
import { extractYouTubeId, getYouTubeEmbedUrl } from '@/lib/video';
import { getCategoryTheme } from '@/shared/categoryThemes';
import type { AuctionCard } from '@/shared/types';

/**
 * BidTok: a vertical, snap-scrolling feed of authenticated lots with real short clips.
 * Supports embedded YouTube Shorts as well as direct video files.
 *
 * Only the clip in view plays — an IntersectionObserver pauses the rest,
 * ensuring fluid 60fps scrolling and zero overlapping audio.
 */
export default function BidTok() {
  const [muted, setMuted] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bidtok,
    queryFn: () => api<{ items: AuctionCard[] }>('/auctions/feed/bidtok'),
  });

  const items = data?.items ?? [];

  // Set initial active clip when data arrives
  useEffect(() => {
    if (items.length > 0 && !activeId) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  // Track the visible clip with IntersectionObserver
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-id');
            if (id) setActiveId(id);
          }
        }
      },
      { root, threshold: 0.55 },
    );

    root.querySelectorAll('[data-clip]').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items.length]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          title="No clips in the feed right now"
          body="Sellers who add a short video or YouTube Short to a listing show up here. Add one to yours and it lands in the feed."
          action={{ label: 'List an item', to: '/sell' }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-0 sm:px-4 sm:py-6">
      <div className="mb-3 hidden items-center justify-between px-1 sm:flex">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink dark:text-white">BidTok</h1>
            <span className="pill border border-[#FF0055]/50 bg-[#FF0055]/15 text-[#FF0055] text-xs font-semibold">
              🔥 Real Shorts Feed
            </span>
          </div>
          <p className="hint text-xs mt-0.5">Scroll the drops. Watch real footage. Bid without leaving the feed.</p>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="btn-quiet rounded-full border border-line px-3 py-1.5 text-xs font-medium backdrop-blur"
        >
          {muted ? <VolumeX className="mr-1.5 h-3.5 w-3.5 text-muted" /> : <Volume2 className="mr-1.5 h-3.5 w-3.5 text-[#00F0FF]" />}
          {muted ? 'Muted' : 'Sound on'}
        </button>
      </div>

      <div
        ref={containerRef}
        className="rail h-[calc(100dvh-8.5rem)] snap-y snap-mandatory overflow-y-auto sm:h-[calc(100dvh-11rem)] sm:rounded-card border sm:border-line/60 bg-black shadow-2xl"
      >
        {items.map((auction) => (
          <Clip
            key={auction.id}
            auction={auction}
            muted={muted}
            isActive={activeId === auction.id}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ))}
      </div>
    </div>
  );
}

function Clip({
  auction,
  muted,
  isActive,
  onToggleMute,
}: {
  auction: AuctionCard;
  muted: boolean;
  isActive: boolean;
  onToggleMute: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const watching = useWatchlistIds();
  const toggle = useToggleWatch();
  const isWatching = watching.has(auction.id);
  const price = auction.currentBid > 0 ? auction.currentBid : auction.startPrice;
  const theme = getCategoryTheme(auction.category);

  const youtubeId = extractYouTubeId(auction.videoUrl);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mount iframe when clip becomes active once
  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
      setIsPlaying(true);
    }
  }, [isActive]);

  const sendYouTubeCommand = (func: 'playVideo' | 'pauseVideo' | 'mute' | 'unMute') => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args: '' }),
          '*',
        );
      } catch {}
    }
  };

  // Sync active play/pause state
  useEffect(() => {
    if (youtubeId) {
      sendYouTubeCommand(isActive ? 'playVideo' : 'pauseVideo');
    } else if (videoRef.current) {
      if (isActive) {
        void videoRef.current.play().catch(() => undefined);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive, youtubeId]);

  // Sync mute state
  useEffect(() => {
    if (youtubeId) {
      sendYouTubeCommand(muted ? 'mute' : 'unMute');
    } else if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted, youtubeId]);

  const togglePlay = (e: React.MouseEvent) => {
    // Ignore clicks on links or buttons
    if ((e.target as HTMLElement).closest('button, a')) return;
    const next = !isPlaying;
    setIsPlaying(next);
    if (youtubeId) {
      sendYouTubeCommand(next ? 'playVideo' : 'pauseVideo');
    } else if (videoRef.current) {
      if (next) void videoRef.current.play().catch(() => undefined);
      else videoRef.current.pause();
    }
  };

  const onWatch = () => {
    if (!user) {
      toast({ tone: 'info', title: 'Sign in to save auctions', body: 'Your watchlist follows you across devices.' });
      return;
    }
    toggle.mutate({ auctionId: auction.id, watching: isWatching });
  };

  return (
    <section
      data-clip
      data-id={auction.id}
      onClick={togglePlay}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-black sm:rounded-card cursor-pointer select-none"
    >
      {/* Visual Background Media */}
      <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
        {/* Poster image underneath so no blank screen during video / iframe loading */}
        <img
          src={auction.images[0]}
          alt=""
          className={clsx(
            'absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-700',
            hasBeenActive ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        />

        {youtubeId && hasBeenActive ? (
          <iframe
            ref={iframeRef}
            src={getYouTubeEmbedUrl(youtubeId, {
              autoplay: true,
              muted: muted,
              loop: true,
              controls: false,
            })}
            title={auction.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="border-0 pointer-events-none select-none"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: 'translate(-50%, -50%) scale(1.38)',
              transformOrigin: 'center center',
            }}
          />
        ) : !youtubeId && auction.videoUrl ? (
          <video
            ref={videoRef}
            src={auction.videoUrl}
            poster={auction.images[0]}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      {/* Paused state overlay */}
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white shadow-2xl border border-white/20">
            <Play className="h-8 w-8 fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Legibility scrim - gentle gradient for clear text readability */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />

      {/* Top badges */}
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md shadow-md"
          style={{
            borderColor: `${theme.color}77`,
            backgroundColor: `${theme.color}22`,
            color: theme.color,
            boxShadow: `0 0 15px ${theme.color}40`,
          }}
        >
          <span>{theme.emoji}</span>
          <span>{theme.shortName} Reel</span>
        </span>
        {youtubeId ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            YouTube Short
          </span>
        ) : null}
      </div>

      {/* Right button stack */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        {/* Watchlist */}
        <button
          onClick={onWatch}
          aria-pressed={isWatching}
          aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
          className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/75 shadow-lg"
        >
          <Heart className={clsx('h-5 w-5', isWatching && 'fill-current text-bid')} />
        </button>

        {/* Sound Toggle Button directly on card */}
        <button
          onClick={onToggleMute}
          aria-label={muted ? 'Turn sound on' : 'Mute sound'}
          title={muted ? 'Unmute' : 'Mute'}
          className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/75 shadow-lg"
        >
          {muted ? <VolumeX className="h-5 w-5 text-white/80" /> : <Volume2 className="h-5 w-5 text-[#00F0FF]" />}
        </button>

        {/* Live auctions link */}
        <Link
          to="/live"
          aria-label="Open live auctions"
          className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur-md border border-white/10 transition-colors hover:bg-black/75 shadow-lg"
        >
          <Radio className="h-5 w-5" />
        </Link>

        {/* External YouTube Link */}
        {youtubeId ? (
          <a
            href={auction.videoUrl!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original short on YouTube"
            title="Open original Short on YouTube"
            className="rounded-full bg-black/50 p-2.5 text-white/80 backdrop-blur-md border border-white/10 transition-colors hover:bg-black/75 hover:text-red-400 shadow-lg"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        ) : null}
      </div>

      {/* Bottom overlay: Seller info, Title, Price, Bid button */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white">
        <Link
          to={`/seller/${auction.seller.username}`}
          className="mb-2.5 flex items-center gap-2 text-sm hover:underline"
        >
          <Avatar src={auction.seller.avatarUrl} name={auction.seller.displayName} size={28} />
          <span className="font-medium">@{auction.seller.username}</span>
        </Link>

        <h2 className="font-display text-lg font-semibold leading-snug drop-shadow-md">{auction.title}</h2>
        {auction.description ? (
          <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-white/80 drop-shadow">{auction.description}</p>
        ) : null}

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">
              {auction.bidCount > 0 ? `Current bid · ${auction.bidCount} bids` : 'Starting bid'}
            </p>
            <p
              className="tabular font-display text-2xl font-bold"
              style={{ color: theme.color, textShadow: `0 0 12px ${theme.color}88` }}
            >
              {formatINR(price)}
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              Ends in <Countdown endsAt={auction.endsAt} className="inline text-white font-medium" />
            </p>
          </div>

          <Link
            to={`/auction/${auction.slug}`}
            className="btn-primary shrink-0 rounded-full px-5 py-2.5 font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: theme.color,
              color: theme.slug === 'collectibles' || theme.slug === 'fashion' || theme.slug === 'entertainment' ? '#000' : '#fff',
              boxShadow: `0 0 20px ${theme.color}55`,
            }}
          >
            Bid now <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
