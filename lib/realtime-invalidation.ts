import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

type MuqtadiRefreshInput = {
  userId?: string;
  mosqueId?: string;
};

export async function invalidateMuqtadiFinancialQueries(
  queryClient: QueryClient,
  input: MuqtadiRefreshInput,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDues(input.userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDashboard(input.mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications(input.userId) }),
  ]);
}

export async function invalidateMosqueLiveQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.prayerTimes(mosqueId ?? 'none') }),
    queryClient.invalidateQueries({ queryKey: queryKeys.announcementsByMosque(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publicDonateConfig(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.publicDonateFunds(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDashboard(mosqueId) }),
  ]);
}
