import type { QueryClient, QueryFilters, QueryKey } from '@tanstack/react-query';

type InvalidateExtra = Omit<QueryFilters, 'queryKey'>;

export function debugInvalidate(
  queryClient: QueryClient,
  key: QueryKey,
  extra?: InvalidateExtra,
) {
  return queryClient.invalidateQueries({
    ...(extra ?? {}),
    queryKey: key,
  });
}

export function debugInvalidateByFilters(queryClient: QueryClient, filters: QueryFilters) {
  return queryClient.invalidateQueries(filters);
}
