'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { isTransientServiceError } from '@/src/utils/error';
import {
  logQueryError,
  logQuerySuccess,
  logOptimisticUpdate,
  logRollback,
  patchInvalidateQueries,
} from '@/lib/query-debug';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        queryCache: new QueryCache({
          onSuccess: (_data, query) => {
            logQuerySuccess(query.queryKey);
          },
          onError: (_error, query) => {
            logQueryError(query.queryKey);
          },
        }),
        mutationCache: new MutationCache({
          onMutate: (variables, mutation) => {
            const type = String(mutation.options.mutationKey?.[0] ?? 'mutation');
            logOptimisticUpdate(type, variables);
          },
          onError: (_error, _variables, context) => {
            logRollback(context);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 45_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: true,
            refetchOnMount: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              if (isTransientServiceError(error)) {
                return failureCount < 2;
              }
              return failureCount < 1;
            },
            retryDelay: (attemptIndex) => (attemptIndex === 1 ? 300 : 800),
          },
          mutations: {
            retry: 1,
          },
        },
      });

      patchInvalidateQueries(client);
      return client;
    },
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
