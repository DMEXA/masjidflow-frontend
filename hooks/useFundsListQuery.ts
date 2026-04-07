import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fundsService, type Fund } from '@/services/funds.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/src/store/auth.store';

export const FUNDS_LIST_LIMIT = 20;

export function useFundsListQuery(mosqueId?: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const queryKey = queryKeys.funds(mosqueId);

  return useQuery<Fund[]>({
    queryKey,
    queryFn: async () => {
      const cached = queryClient.getQueryData<Fund[]>(queryKey);
      if (cached) {
        return cached;
      }

      return fundsService.getAll({ limit: FUNDS_LIST_LIMIT });
    },
    enabled: Boolean(mosqueId) && Boolean(token),
  });
}
