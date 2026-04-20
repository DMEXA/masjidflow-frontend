import { useQuery } from '@tanstack/react-query';
import { fundsService, type Fund } from '@/services/funds.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/src/store/auth.store';

export const FUNDS_LIST_LIMIT = 20;

export function useFundsListQuery(mosqueId?: string) {
  const token = useAuthStore((state) => state.token);
  const queryKey = queryKeys.funds(mosqueId);

  return useQuery<Fund[]>({
    queryKey,
    queryFn: () => fundsService.getAll({ limit: FUNDS_LIST_LIMIT }),
    enabled: Boolean(mosqueId) && Boolean(token),
    staleTime: 15000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
