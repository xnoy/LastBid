import { QueryClient } from '@tanstack/react-query';

/**
 * Cache policy tuned for an auction site under load.
 *
 * Live prices arrive over the socket, so polling is off everywhere. Queries are
 * not refetched when a window regains focus either — a user tabbing between
 * twenty auctions would otherwise fire twenty requests for data the socket has
 * already delivered.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  home: ['home'] as const,
  auctions: (params: string) => ['auctions', params] as const,
  auction: (idOrSlug: string) => ['auction', idOrSlug] as const,
  autoBid: (auctionId: string) => ['auto-bid', auctionId] as const,
  watchlist: ['watchlist'] as const,
  watchlistIds: ['watchlist', 'ids'] as const,
  myBids: ['my-bids'] as const,
  myAuctions: ['my-auctions'] as const,
  notifications: ['notifications'] as const,
  orders: (role: string) => ['orders', role] as const,
  order: (id: string) => ['order', id] as const,
  live: ['live'] as const,
  liveSession: (id: string) => ['live', id] as const,
  seller: (username: string) => ['seller', username] as const,
  bidtok: ['bidtok'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminAuctions: (status: string) => ['admin', 'auctions', status] as const,
};
