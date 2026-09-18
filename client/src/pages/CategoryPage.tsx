import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Crown } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { AuctionCard } from '@/components/AuctionCard';
import { Filters, EMPTY_FILTERS, type FilterState } from '@/components/Filters';
import { CardSkeletonGrid, EmptyState } from '@/components/ui';
import { useWatchlistIds } from '@/hooks/useWatchlist';
import { findCategory } from '@/shared/categories';
import { getCategoryTheme } from '@/shared/categoryThemes';
import { filtersToQuery } from './Marketplace';
import type { AuctionCard as AuctionCardType } from '@/shared/types';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = findCategory(slug);
  const theme = getCategoryTheme(slug);
  const isLuxury = slug === 'collectibles';

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...EMPTY_FILTERS,
    category: slug,
    subcategory: searchParams.get('subcategory') ?? '',
  }));

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: slug,
      subcategory: searchParams.get('subcategory') ?? '',
    }));
  }, [slug, searchParams]);

  const query = useMemo(() => filtersToQuery(filters, 1), [filters]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auctions(query),
    queryFn: () => api<{ items: AuctionCardType[]; total: number }>(`/auctions${query}`),
    enabled: !!category,
  });

  const watching = useWatchlistIds();

  if (!category) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">No such category</h1>
        <Link to="/marketplace" className="btn-primary mt-4">Browse everything</Link>
      </div>
    );
  }

  const selectSub = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('subcategory', value);
    else next.delete('subcategory');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 overflow-hidden">
      {/* Dynamic Category Ambient Neon Glow */}
      <div
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-[450px] w-full max-w-5xl rounded-full blur-[110px] opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${theme.color} 0%, rgba(10, 13, 24, 0) 70%)`,
        }}
      />

      <header className="relative z-10 mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {isLuxury ? (
            <span className="pill border border-[#FFB800]/50 bg-[#FFB800]/15 text-[#FFB800] font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(255,184,0,0.3)]">
              <Crown className="h-3.5 w-3.5 inline text-[#FFB800]" /> LUXURY & ANTIQUES VAULT
            </span>
          ) : (
            <span
              className="pill font-semibold text-xs border"
              style={{
                borderColor: `${theme.color}50`,
                backgroundColor: `${theme.color}15`,
                color: theme.color,
              }}
            >
              {theme.emoji} CURATED DROP
            </span>
          )}
          <span className="text-xs text-muted">
            {data ? `${data.total} auction${data.total === 1 ? '' : 's'} available` : 'Loading auctions...'}
          </span>
        </div>

        <div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-ink dark:text-white flex items-center gap-3">
            <span className="drop-shadow-sm">{theme.emoji}</span>
            <span
              style={
                isLuxury
                  ? {
                      background: 'linear-gradient(135deg, #FFF6D3 0%, #FFB800 60%, #F59E0B 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }
                  : undefined
              }
            >
              {category.name}
            </span>
          </h1>
          <p className="hint mt-2 max-w-2xl text-base">{category.tagline}</p>
        </div>

        {/* Subcategory Pills with Category Neon Styling */}
        <div className="rail mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => selectSub('')}
            className={clsx(
              'pill shrink-0 border transition-all duration-200',
              !filters.subcategory
                ? 'font-bold'
                : 'border-line text-muted hover:text-ink',
            )}
            style={
              !filters.subcategory
                ? {
                    borderColor: theme.color,
                    backgroundColor: `${theme.color}20`,
                    color: theme.color,
                    boxShadow: `0 0 12px ${theme.color}40`,
                  }
                : undefined
            }
          >
            All Lots
          </button>
          {category.subcategories.map((sub) => {
            const isSelected = filters.subcategory === sub.slug;
            return (
              <button
                key={sub.slug}
                onClick={() => selectSub(sub.slug)}
                className={clsx(
                  'pill shrink-0 border transition-all duration-200',
                  isSelected ? 'font-bold' : 'border-line text-muted hover:text-ink',
                )}
                style={
                  isSelected
                    ? {
                        borderColor: theme.color,
                        backgroundColor: `${theme.color}20`,
                        color: theme.color,
                        boxShadow: `0 0 12px ${theme.color}40`,
                      }
                    : undefined
                }
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <Filters value={filters} onChange={setFilters} lockCategory resultCount={data?.total} />
        </aside>

        <div>
          {isLoading ? (
            <CardSkeletonGrid count={8} />
          ) : data && data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {data.items.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} watching={watching.has(auction.id)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={`Nothing live in ${category.name} right now`}
              body="Auctions in this category come and go through the day. Check back, or list something yourself."
              action={{ label: 'Sell an item', to: '/sell' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
