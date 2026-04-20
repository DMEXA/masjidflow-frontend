import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { debugInvalidate } from '@/lib/query-debug';

export async function invalidateMoneyQueries(queryClient: QueryClient, mosqueId?: string): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.fundsRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.donationsRoot(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.expensesRoot(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadis(), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDetailRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDetailDuesRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiPaymentsRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiHistoryRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.reports),
    debugInvalidate(queryClient, queryKeys.dashboardOverview(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDashboard(), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDues(), { exact: false }),
  ]);
}

export async function invalidateDonationMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.donationsRoot(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.donationsPendingCount(mosqueId)),
    debugInvalidate(queryClient, queryKeys.reports),
    debugInvalidate(queryClient, queryKeys.dashboardOverview(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.fundsRoot, { exact: false }),
  ]);
}

export async function invalidateExpenseMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.expensesRoot(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.expensesPendingCount(mosqueId)),
    debugInvalidate(queryClient, queryKeys.reports),
    debugInvalidate(queryClient, queryKeys.dashboardOverview(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.fundsRoot, { exact: false }),
  ]);
}

export async function invalidateMuqtadiMutationQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.muqtadis(), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiStats, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiSalarySummary, { exact: false }),
    debugInvalidate(queryClient, queryKeys.imamSalaryCycles(mosqueId), { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDetailRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiDetailDuesRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiPaymentsRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.muqtadiHistoryRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.dashboardOverview(mosqueId), { exact: false }),
  ]);
}

export async function invalidateFundsQueries(
  queryClient: QueryClient,
  mosqueId?: string,
): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.fundsRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.inactiveFunds(mosqueId)),
    debugInvalidate(queryClient, queryKeys.reports),
    debugInvalidate(queryClient, queryKeys.dashboardOverview(mosqueId), { exact: false }),
  ]);
}

export async function invalidatePlatformMosquesQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    debugInvalidate(queryClient, queryKeys.platformMosquesRoot, { exact: false }),
    debugInvalidate(queryClient, queryKeys.platformHomeMosques),
  ]);
}

export async function invalidatePlatformPaymentsQueries(queryClient: QueryClient): Promise<void> {
  await debugInvalidate(queryClient, queryKeys.platformPaymentsRoot, { exact: false });
}
