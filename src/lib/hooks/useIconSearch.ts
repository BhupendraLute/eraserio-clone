import { useQuery } from '@tanstack/react-query';
import { searchIconsDynamic } from '@/lib/icons/icon-catalog';
import type { IconCatalogEntry } from '@/lib/icons/icon-catalog';

export function useIconSearch(query: string, maxResults: number = 120) {
  return useQuery<IconCatalogEntry[]>({
    queryKey: ['icons', 'search', query, maxResults],
    queryFn: async () => {
      // Simulate micro-async computation or API fetch
      return searchIconsDynamic(query, maxResults);
    },
    staleTime: 1000 * 60 * 15, // 15 mins cache
    gcTime: 1000 * 60 * 30, // 30 mins garbage collection
    placeholderData: (previousData) => previousData,
  });
}
