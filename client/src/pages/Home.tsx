import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Radio, ShieldCheck, Zap, Sparkles, X, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { AuctionCard } from '@/components/AuctionCard';
import { Rail } from '@/components/Rail';
import { CardSkeletonGrid, SectionHeading } from '@/components/ui';
import { useWatchlistIds } from '@/hooks/useWatchlist';
import { formatINR } from '@/lib/format';
import {
  CATEGORY_THEMES,
  ORDERED_CATEGORY_KEYS,
  getCategoryTheme,
} from '@/shared/categoryThemes';
import type { AuctionCard as AuctionCardType, LiveSession } from '@/shared/types';

interface HomeFeed {
  endingSoon: AuctionCardType[];
  trending: AuctionCardType[];
  recent: AuctionCardType[];
  live: LiveSession[];
  byCategory: Array<{ category: string; items: AuctionCardType[] }>;
}

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.home,
    queryFn: () => api<HomeFeed>('/auctions/home'),
  });
  const watching = useWatchlistIds();

  // Active Category switcher matching Figma design
  const [activeTab, setActiveTab] = useState<string>('collectibles');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const activeTheme = getCategoryTheme(activeTab);

  // Find real items for active category
  const activeCategoryItems =
    activeTab === 'bidtok'
      ? data?.trending.filter((item) => !!item.videoUrl) || data?.trending.slice(0, 4) || []
      : data?.byCategory.find((g) => g.category === (activeTab === 'tech' ? 'tech' : activeTab))?.items || [];

  return (
    <div className="relative mx-auto max-w-7xl space-y-16 px-4 py-8 lg:py-12 overflow-hidden">
      {/* Dynamic Ambient Neon Backdrop Glow */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-full max-w-5xl rounded-full blur-[120px] opacity-25 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle, ${activeTheme.color} 0%, rgba(10, 13, 24, 0) 70%)`,
        }}
      />

      {/* Hero Section matching Figma */}
      <section className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          {/* Pulsing Category Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold backdrop-blur-md transition-colors duration-500"
            style={{
              borderColor: `${activeTheme.color}66`,
              backgroundColor: `${activeTheme.color}15`,
              color: activeTheme.color,
            }}
          >
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: activeTheme.color,
                boxShadow: `0 0 10px ${activeTheme.color}`,
              }}
            />
            <span className="tracking-wide uppercase font-display">
              Live Auctions — 72+ Active
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink dark:text-white leading-[1.08] transition-all duration-300">
            <span className="mr-3 inline-block drop-shadow-md">{activeTheme.emoji}</span>
            <span>{activeTheme.headline.replace(/^[\p{Emoji}\s]+/u, '')}</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted transition-all duration-300">
            {activeTheme.subtitle}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to={activeTheme.link}
              className={clsx(
                'inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95',
                activeTheme.buttonClass,
              )}
            >
              Browse Auctions <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setHowItWorksOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-surface/50 px-6 py-3 text-base font-semibold text-ink backdrop-blur-md transition-all hover:bg-raised hover:border-line"
            >
              <HelpCircle className="h-4 w-4 text-muted" /> How It Works
            </button>
          </div>
        </div>

        {/* Featured Showcase Media Card matching Figma */}
        <div className="relative">
          <Link
            to={activeTheme.link}
            className="group relative block aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-line/60 bg-surface shadow-2xl transition-all duration-500 hover:border-line"
            style={{
              boxShadow: `0 0 50px -10px ${activeTheme.color}35`,
            }}
          >
            <img
              src={activeTheme.featuredImage}
              alt={activeTheme.featuredTitle}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {/* Floating Glassmorphic Top Bid Badge */}
            <div
              className="absolute bottom-5 left-5 rounded-2xl border backdrop-blur-xl bg-black/65 px-5 py-3 shadow-2xl transition-all duration-300"
              style={{
                borderColor: `${activeTheme.color}55`,
                boxShadow: `0 0 25px -5px ${activeTheme.color}40`,
              }}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/70">TOP BID</p>
              <p
                className="tabular font-display text-2xl font-bold tracking-tight"
                style={{
                  color: activeTheme.color,
                  textShadow: `0 0 15px ${activeTheme.color}66`,
                }}
              >
                {activeTheme.topBid}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[0.7rem] font-semibold text-white/90">
                <span
                  className="h-2 w-2 rounded-full animate-ping"
                  style={{ backgroundColor: activeTheme.color }}
                />
                <span className="tracking-wide">LIVE</span>
              </div>
            </div>

            {/* Title banner top right */}
            <div className="absolute top-4 right-4">
              <span className="pill bg-black/70 backdrop-blur-md text-white text-xs border border-white/10">
                {activeTheme.featuredTitle}
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Figma Category Switcher Tabs Bar */}
      <section className="border-y border-line/80 py-2">
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth">
          {ORDERED_CATEGORY_KEYS.map((key) => {
            const cat = CATEGORY_THEMES[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx(
                  'group relative flex shrink-0 items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium transition-colors duration-200',
                  isActive ? 'text-ink dark:text-white font-semibold' : 'text-muted hover:text-ink',
                )}
              >
                <span className="text-base">{cat.emoji}</span>
                <span>{cat.name}</span>
                {isActive && (
                  <span
                    className="ml-1 rounded-full px-2 py-0.5 text-xs font-bold transition-all"
                    style={{
                      backgroundColor: `${cat.color}25`,
                      color: cat.color,
                    }}
                  >
                    72
                  </span>
                )}
                {/* Active Indicator Underline */}
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: cat.activeLineColor,
                      boxShadow: `0 0 12px ${cat.color}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Figma 4 Stat Cards Row */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'ACTIVE BIDS', value: activeTheme.stats.activeBids },
          { label: 'ENDING SOON', value: activeTheme.stats.endingSoon },
          { label: 'TOP BID', value: activeTheme.stats.topBid },
          { label: 'VERIFIED ITEMS', value: activeTheme.stats.verifiedItems },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-line/60 bg-surface/50 p-5 backdrop-blur-md transition-all duration-300 hover:border-line"
            style={{
              boxShadow: `0 0 20px -6px ${activeTheme.color}20`,
            }}
          >
            <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">{stat.label}</p>
            <p
              className="tabular font-display text-2xl sm:text-3xl font-bold mt-1.5"
              style={{
                color: activeTheme.color,
                textShadow: `0 0 16px ${activeTheme.color}55`,
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* Dynamic Category Real Auctions Section */}
      <section className="space-y-5">
        <SectionHeading
          title={`${activeTheme.emoji} ${activeTheme.name} Auctions`}
          description={activeTheme.subtitle}
          action={
            <Link
              to={activeTheme.link}
              className="font-semibold text-sm transition-colors hover:underline"
              style={{ color: activeTheme.color }}
            >
              See all {activeTheme.name} →
            </Link>
          }
        />

        {isLoading ? (
          <CardSkeletonGrid count={4} />
        ) : activeCategoryItems.length > 0 ? (
          <Rail>
            {activeCategoryItems.map((auction) => (
              <div key={auction.id} className="snap-start">
                <AuctionCard auction={auction} watching={watching.has(auction.id)} fixedWidth />
              </div>
            ))}
          </Rail>
        ) : (
          <div
            className="rounded-2xl border p-8 text-center backdrop-blur-sm"
            style={{
              borderColor: `${activeTheme.color}40`,
              backgroundColor: `${activeTheme.color}08`,
            }}
          >
            <p className="font-display text-lg font-semibold text-ink dark:text-white">
              No live auctions currently listed in {activeTheme.name}
            </p>
            <p className="text-sm text-muted mt-1">
              Be the first to list a rare lot in this category.
            </p>
            <Link to="/sell" className={clsx('mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold', activeTheme.buttonClass)}>
              List in {activeTheme.name}
            </Link>
          </div>
        )}
      </section>

      {/* Live Stream Section */}
      {data?.live.length ? (
        <section>
          <SectionHeading
            title="Live Stream Auctions"
            description="Sellers on camera, real-time bidding in the room."
            action={<Link to="/live" className="btn-quiet">See all</Link>}
          />
          <Rail>
            {data.live.map((session) => (
              <Link
                key={session.id}
                to={`/live/${session.id}`}
                className="card group w-[19rem] shrink-0 snap-start overflow-hidden border border-line hover:border-[#FF0055]/50 transition-all hover:shadow-[0_0_25px_rgba(255,0,85,0.25)]"
              >
                <div className="relative aspect-video overflow-hidden bg-raised">
                  <img
                    src={session.thumbnailUrl ?? session.auction.images[0]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="pill absolute left-3 top-3 bg-urgent text-white shadow-[0_0_12px_rgba(255,77,109,0.5)]">
                    <Radio className="h-3 w-3" /> Live
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-1 font-medium">{session.title}</p>
                  <p className="hint mt-1 line-clamp-1">{session.auction.title}</p>
                  <p className="tabular mt-2 font-display font-semibold text-ink dark:text-white">
                    {formatINR(session.auction.currentBid || session.auction.startPrice)}
                  </p>
                </div>
              </Link>
            ))}
          </Rail>
        </section>
      ) : null}

      {/* Standard Marketplace Rails */}
      {data ? (
        <>
          <HomeRail
            title="Ending Soon"
            description="The clock decides these lots."
            items={data.endingSoon}
            watching={watching}
            to="/marketplace?sort=ending-soon"
          />
          <HomeRail
            title="Trending Auctions"
            description="Where the bidding action is hottest right now."
            items={data.trending}
            watching={watching}
            to="/marketplace?sort=most-bids"
          />

          {/* Dedicated Category Rails */}
          {data.byCategory.map((group) => {
            const theme = getCategoryTheme(group.category);
            return (
              <HomeRail
                key={group.category}
                title={`${theme.emoji} ${theme.name}`}
                description={theme.subtitle}
                items={group.items}
                watching={watching}
                to={theme.link}
              />
            );
          })}

          {/* BidTok Feature Card */}
          <section className="relative overflow-hidden rounded-3xl border border-[#FF0055]/40 bg-gradient-to-r from-surface via-surface to-[#FF0055]/10 shadow-[0_0_40px_rgba(255,0,85,0.15)]">
            <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
              <div>
                <span className="pill bg-[#FF0055]/15 text-[#FF0055] font-semibold border border-[#FF0055]/30">
                  🔥 BIDTOK FEED
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">
                  Scroll. Watch. Bid without leaving the feed.
                </h2>
                <p className="hint mt-2 max-w-xl text-base">
                  A high-velocity vertical video stream of authenticated lots that look better in motion.
                </p>
              </div>
              <Link
                to="/bidtok"
                className="btn bg-[#FF0055] text-white font-bold hover:bg-[#E11D48] px-7 py-3 rounded-full shadow-[0_0_25px_rgba(255,0,85,0.4)]"
              >
                Open BidTok Feed
              </Link>
            </div>
          </section>

          <HomeRail
            title="Recently Listed"
            description="Fresh from sellers in the last few hours."
            items={data.recent}
            watching={watching}
            to="/marketplace?sort=newest"
          />
        </>
      ) : null}

      {/* How It Works Modal */}
      {howItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="font-display text-xl font-bold">How LastBid Works</h2>
              <button
                onClick={() => setHowItWorksOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-raised hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <Zap className="h-6 w-6 shrink-0 text-bid mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Real-Time Proxy Bidding</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Set your maximum bid once. Our engine automatically bids for you by one increment at a time, keeping your price as low as possible.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Sparkles className="h-6 w-6 shrink-0 text-[#FFB800] mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Anti-Snipe Clock Protection</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Any bid placed in the final 60 seconds extends the countdown by another 60 seconds, giving genuine bidders a fair shot.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <ShieldCheck className="h-6 w-6 shrink-0 text-win mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Verified Escrow Settlement</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Winning bids enter a secure checkout with tracked express dispatch. Funds release to the seller only once delivery is confirmed.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-4 flex justify-end">
              <button
                onClick={() => setHowItWorksOpen(false)}
                className="btn-primary rounded-full px-6 py-2"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeRail({
  title,
  description,
  items,
  watching,
  to,
}: {
  title: string;
  description: string;
  items: AuctionCardType[];
  watching: Set<string>;
  to: string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading
        title={title}
        description={description}
        action={<Link to={to} className="btn-quiet">See all</Link>}
      />
      <Rail>
        {items.map((auction) => (
          <div key={auction.id} className="snap-start">
            <AuctionCard auction={auction} watching={watching.has(auction.id)} fixedWidth />
          </div>
        ))}
      </Rail>
    </section>
  );
}
