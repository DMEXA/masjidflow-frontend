'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { muqtadisService, type MuqtadiDashboardApiResponse } from '@/services/muqtadis.service';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency } from '@/src/utils/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { MuqtadiDuesSkeleton } from '@/components/common/loading-skeletons';
import { muqtadiQueryPolicy } from '@/lib/muqtadi-query-policy';

type PaymentFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED';

function getPaymentSortTimestamp(payment: { createdAt?: string; updatedAt?: string }) {
  const updated = payment.updatedAt ? new Date(payment.updatedAt).getTime() : 0;
  const created = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
  return Math.max(updated || 0, created || 0);
}

function getStatusBadgeClass(status: string) {
  if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function getDisplayStatus(status: string) {
  if (status === 'VERIFIED') return 'VERIFIED';
  if (status === 'PENDING') return 'PENDING';
  if (status === 'REJECTED') return 'REJECTED';
  return 'FAILED';
}

function needsRetryAction(status: string) {
  return status === 'PENDING' || status === 'REJECTED';
}

function getRetryLabel() {
  return 'Continue Payment';
}

function buildRetryHref(payment: MuqtadiDashboardApiResponse['history'][number]) {
  const params = new URLSearchParams({
    resumeProof: '1',
    paymentId: String(payment.id),
    amount: String(payment.amount ?? ''),
  });
  if (payment.cycleId) params.set('cycleId', String(payment.cycleId));
  if (payment.dueId) params.set('dueId', String(payment.dueId));
  if (payment.method) params.set('method', String(payment.method));
  return `/app/pay?${params.toString()}`;
}

export default function MyDuesPage() {
  const { mosque } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PaymentFilter>('ALL');
  const dashboardKey = queryKeys.muqtadiDashboard(mosque?.id);

  const dashboardQuery = useQuery<MuqtadiDashboardApiResponse>({
    queryKey: dashboardKey,
    queryFn: () => muqtadisService.getDashboard(),
    enabled: Boolean(mosque?.id),
    staleTime: muqtadiQueryPolicy.dues.staleTime,
    gcTime: muqtadiQueryPolicy.dues.gcTime,
    placeholderData: (previous) => previous ?? queryClient.getQueryData<MuqtadiDashboardApiResponse>(dashboardKey),
    refetchOnWindowFocus: muqtadiQueryPolicy.dues.refetchOnWindowFocus,
    refetchOnMount: true,
    refetchInterval: muqtadiQueryPolicy.dues.refetchInterval,
    refetchIntervalInBackground: true,
  });

  const history = useMemo(
    () => dashboardQuery.data?.history ?? [],
    [dashboardQuery.data?.history],
  );
  const hasFinancialTruth = Boolean(dashboardQuery.data);
  const outstandingAmount = hasFinancialTruth
    ? Number(dashboardQuery.data?.outstandingAmount ?? dashboardQuery.data?.remainingAmount ?? 0)
    : Number.NaN;
  const allDuesPaid = outstandingAmount <= 0.0001;
  const firstRetryablePayment = history.find((item) => needsRetryAction(item.status)) ?? null;
  const hasRetryablePayment = history.some((item) => needsRetryAction(item.status));

  const payments = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => getPaymentSortTimestamp(b) - getPaymentSortTimestamp(a),
    );

    if (filter === 'ALL') return sorted;
    return sorted.filter((item) => item.status === filter);
  }, [filter, history]);

  if (dashboardQuery.isLoading && !hasFinancialTruth) {
    return <MuqtadiDuesSkeleton />;
  }

  if (dashboardQuery.isError) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <div className="rounded-xl border border-[#d8e5ce] bg-[#f6faf2] p-3">
        <MuqtadiBackButton />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment History</p>
          <p className="mt-1 text-3xl font-bold">{payments.length}</p>
          <p className="text-sm text-muted-foreground">Entries</p>
          <div className="mt-3">
            {hasRetryablePayment && firstRetryablePayment ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={buildRetryHref(firstRetryablePayment)}>Continue Pending Payment</Link>
              </Button>
            ) : allDuesPaid ? (
              <Button disabled className="w-full sm:w-auto">All dues paid</Button>
            ) : (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/app/pay">Pay Now</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Payments</CardTitle>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm sm:w-40"
              value={filter}
              onChange={(e) => setFilter(e.target.value as PaymentFilter)}
            >
              <option value="ALL">All</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="max-h-[65vh] overflow-y-auto">
          {payments.length === 0 ? (
            allDuesPaid && !hasRetryablePayment ? (
              <ListEmptyState
                title="All dues paid"
                description="You have no outstanding dues right now."
                icon={<Plus className="h-5 w-5" />}
                className="min-h-44"
              />
            ) : (
              <ListEmptyState
                title="No payments yet"
                description="Make your first contribution to see payment history here."
                actionLabel="Contribute Now"
                actionHref="/app/pay"
                icon={<Plus className="h-5 w-5" />}
                className="min-h-44"
              />
            )
          ) : (
            <>
            <div className="hidden md:block">
              <div className="overflow-hidden rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                        <td className="px-3 py-2">
                          {new Intl.DateTimeFormat('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }).format(new Date(payment.createdAt))}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={getStatusBadgeClass(payment.status)}>
                            {getDisplayStatus(payment.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {needsRetryAction(payment.status) ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={buildRetryHref(payment)}>{getRetryLabel()}</Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(payment.createdAt))}
                    </p>
                  </div>
                  <Badge className={getStatusBadgeClass(payment.status)}>
                    {getDisplayStatus(payment.status)}
                  </Badge>
                </div>
                {needsRetryAction(payment.status) ? (
                  <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                    <Link href={buildRetryHref(payment)}>{getRetryLabel()}</Link>
                  </Button>
                ) : null}
              </div>
            ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


