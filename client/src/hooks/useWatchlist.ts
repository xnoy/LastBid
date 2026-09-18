import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/store/AuthContext';

/**
 * Watchlist membership is fetched once as a flat list of ids, so a grid of
 * cards costs one request instead of one per card.
 */
export function useWatchlistIds(): Set<string> {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: queryKeys.watchlistIds,
    queryFn: () => api<{ ids: string[] }>('/watchlist/ids'),
    enabled: !!user,
    staleTime: 60_000,
  });
  return new Set(data?.ids ?? []);
}

export function useToggleWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ auctionId, watching }: { auctionId: string; watching: boolean }) =>
      api<{ watching: boolean }>(`/watchlist/${auctionId}`, {
        method: watching ? 'DELETE' : 'POST',
      }),
    // Optimistic: the heart fills instantly, and rolls back if the call fails.
    onMutate: async ({ auctionId, watching }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlistIds });
      const previous = queryClient.getQueryData<{ ids: string[] }>(queryKeys.watchlistIds);
      queryClient.setQueryData<{ ids: string[] }>(queryKeys.watchlistIds, (old) => {
        const ids = new Set(old?.ids ?? []);
        if (watching) ids.delete(auctionId);
        else ids.add(auctionId);
        return { ids: [...ids] };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.watchlistIds, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    },
  });
}
