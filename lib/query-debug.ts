import type { QueryClient, QueryFilters, QueryKey } from '@tanstack/react-query';

const isDev = process.env.NODE_ENV === 'development';

type InvalidateExtra = Omit<QueryFilters, 'queryKey'>;

export function logApiCall(payload: { url?: string; method?: string }): void {
  if (!isDev) return;
  console.log('[API CALL]', {
    url: payload.url ?? '',
    method: String(payload.method ?? 'GET').toUpperCase(),
    time: new Date().toISOString(),
  });
}

export function logQuerySuccess(queryKey: QueryKey): void {
  if (!isDev) return;
  console.log('[QUERY SUCCESS]', queryKey);
}

export function logQueryError(queryKey: QueryKey): void {
  if (!isDev) return;
  console.log('[QUERY ERROR]', queryKey);
}

export function debugInvalidate(
  queryClient: QueryClient,
  key: QueryKey,
  extra?: InvalidateExtra,
) {
  if (isDev) {
    console.log('[INVALIDATE]', key);
  }

  return queryClient.invalidateQueries({
    ...(extra ?? {}),
    queryKey: key,
  });
}

export function debugInvalidateByFilters(queryClient: QueryClient, filters: QueryFilters) {
  if (isDev) {
    const marker = Array.isArray(filters.queryKey) ? filters.queryKey : ['predicate'];
    console.log('[INVALIDATE]', marker);
  }

  return queryClient.invalidateQueries(filters);
}

export function patchInvalidateQueries(queryClient: QueryClient): void {
  if (!isDev) return;

  const clientWithFlag = queryClient as QueryClient & { __debugInvalidatePatched?: boolean };
  if (clientWithFlag.__debugInvalidatePatched) {
    return;
  }

  clientWithFlag.__debugInvalidatePatched = true;

  const original = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters?: QueryFilters) => {
    const marker = Array.isArray(filters?.queryKey) ? filters.queryKey : ['predicate'];
    console.log('[INVALIDATE]', marker);
    return original(filters);
  }) as QueryClient['invalidateQueries'];
}

export function logOptimisticUpdate(type: string, data: unknown): void {
  if (!isDev) return;
  console.log('[OPTIMISTIC UPDATE]', { type, data });
}

export function logRollback(context: unknown): void {
  if (!isDev) return;
  console.log('[ROLLBACK]', context);
}

export function startFlowGroup(name: string): void {
  if (!isDev) return;
  console.group(name);
}

export function endFlowGroup(): void {
  if (!isDev) return;
  console.groupEnd();
}
