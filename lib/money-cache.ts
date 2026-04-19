import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export async function invalidateMoneyQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.funds(), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDashboard(), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDues(), exact: false }),
  ]);
}

export async function invalidateDonationMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.donationsRoot(mosqueId), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.donationsPendingCount(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview(mosqueId), exact: false }),
  ]);
}

export async function invalidateExpenseMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.expensesRoot(mosqueId), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expensesPendingCount(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview(mosqueId), exact: false }),
  ]);
}

export async function invalidateMuqtadiMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.muqtadis(), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview(mosqueId), exact: false }),
  ]);
}

export async function invalidateFundsQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.funds(mosqueId), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.inactiveFunds(mosqueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
  ]);
}

export async function invalidatePlatformMosquesQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.platformMosquesRoot, exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.platformHomeMosques }),
  ]);
}

export async function invalidatePlatformPaymentsQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.platformPaymentsRoot, exact: false });
}
