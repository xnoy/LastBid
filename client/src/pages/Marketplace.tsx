import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, buildQuery } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { AuctionCard } from '@/components/AuctionCard';
import { Filters, EMPTY_FILTERS, type FilterState } from '@/components/Filters';
import { CardSkeletonGrid, EmptyState } from '@/components/ui';
import { useWatchlistIds } from '@/hooks/useWatchlist';
import { toPaise } from '@/lib/format';
import type { AuctionCard as AuctionCardType } from '@/shared/types';

interface DiscoveryResponse {
  items: AuctionCardType[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

/** Turns the filter form into the query string the API expects. */
export function filtersToQuery(filters: FilterState, page: number): string {
  return buildQuery({
    q: filters.q,
    category: filters.category,
    subcategory: filters.subcategory,
    minPrice: filters.minPrice ? toPaise(Number(filters.minPrice)) : undefined,
    maxPrice: filters.maxPrice ? toPaise(Number(filters.maxPrice)) : undefined,
    condition: filters.condition,
    endingWithinHours: filters.endingWithinHours,
    sort: filters.sort,
    page,
  });
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<FilterState>(() => ({
    ...EMPTY_FILTERS,
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    subcategory: searchParams.get('subcategory') ?? '',
    sort: (searchParams.get('sort') as FilterState['sort']) ?? 'ending-soon',
  }));

  // Keep the URL shareable, without pushing a history entry per keystroke.
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    if (filters.category) next.set('category', filters.category);
    if (filters.subcategory) next.set('subcategory', filters.subcategory);
    if (filters.sort !== 'ending-soon') next.set('sort', filters.sort);
    setSearchParams(next, { replace: true });
    setPage(1);
  }, [filters, setSearchParams]);

  // React to a search submitted from the header while already on this page.
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setFilters((current) => (current.q === q ? current : { ...current, q }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);

  const query = useMemo(() => filtersToQuery(filters, page), [filters, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.auctions(query),
    queryFn: () => api<DiscoveryResponse>(`/auctions${query}`),
    placeholderData: (previous) => previous,
  });

  const watching = useWatchlistIds();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {filters.q ? `Results for "${filters.q}"` : 'All auctions'}
        </h1>
        <p className="hint mt-1">
          Only live listings appear here. Sold and withdrawn lots move to the seller's history.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <Filters value={filters} onChange={setFilters} resultCount={data?.total} />
        </aside>

        <div>
          {isLoading ? (
            <CardSkeletonGrid count={9} />
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {data.items.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} watching={watching.has(auction.id)} />
                ))}
              </div>

              {data.hasMore || page > 1 ? (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="btn-ghost"
                  >
                    Previous
                  </button>
                  <span className="tabular hint">Page {page}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.hasMore || isFetching}
                    className="btn-ghost"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              body="Try widening the price range, or clear a filter or two. New lots are listed through the day."
              action={{ label: 'Clear search', to: '/marketplace' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
