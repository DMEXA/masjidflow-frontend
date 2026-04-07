'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  platformAdminService,
  type PaginationMeta,
  type PlatformSubscriptionPaymentRow,
} from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatDateTime } from '@/src/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSafeLimit } from '@/src/utils/pagination';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformPaymentsPage() {
  const searchParams = useSearchParams();
  const mosqueIdFilter = searchParams.get('mosqueId')?.trim() || '';
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const pageLimit = getSafeLimit(20);

  const paymentsQuery = useQuery<{ data: PlatformSubscriptionPaymentRow[]; meta: PaginationMeta }>({
    queryKey: queryKeys.platformPayments({
      page,
      limit: pageLimit,
      mosqueId: mosqueIdFilter || 'all',
      status: 'all',
    }),
    queryFn: () =>
      platformAdminService.getSubscriptionPayments({
        page,
        limit: pageLimit,
        ...(mosqueIdFilter ? { mosqueId: mosqueIdFilter } : {}),
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rows = paymentsQuery.data?.data ?? [];
  const meta = paymentsQuery.data?.meta ?? EMPTY_META;
  const loading = paymentsQuery.isLoading;

  const invalidatePayments = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
  };

  const verifyMutation = useMutation({
    mutationFn: (input: { mosqueId: string; intentId: string }) =>
      platformAdminService.verifySubscriptionPayment(input.mosqueId, input.intentId),
    onSuccess: invalidatePayments,
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { mosqueId: string; intentId: string }) =>
      platformAdminService.rejectSubscriptionPayment(input.mosqueId, input.intentId),
    onSuccess: invalidatePayments,
  });

  const verify = async (row: PlatformSubscriptionPaymentRow) => {
    const key = `${row.mosqueId}-${row.intentId}`;
    setActingKey(key);
    try {
      await verifyMutation.mutateAsync({ mosqueId: row.mosqueId, intentId: row.intentId });
      toast.success('Payment verified');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify payment'));
    } finally {
      setActingKey(null);
    }
  };

  const reject = async (row: PlatformSubscriptionPaymentRow) => {
    const key = `${row.mosqueId}-${row.intentId}`;
    setActingKey(key);
    try {
      await rejectMutation.mutateAsync({ mosqueId: row.mosqueId, intentId: row.intentId });
      toast.success('Payment rejected');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject payment'));
    } finally {
      setActingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Payments" description="Verify subscription payments by proof or reconciliation intent" />
      <Card>
        <CardHeader>
          <CardTitle>Subscription Payment Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mosqueIdFilter ? (
            <p className="text-xs text-muted-foreground">Filtered by mosque ID: {mosqueIdFilter}</p>
          ) : null}

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            ) : rows.length === 0 ? (
              <ListEmptyState
                title="No payments found"
                description={mosqueIdFilter ? 'No queued payments for this mosque yet.' : 'Payments will appear here once mosques submit proof.'}
                actionLabel={mosqueIdFilter ? 'View All Payments' : 'View Mosques'}
                actionHref={mosqueIdFilter ? '/platform/payments' : '/platform/mosques'}
                className="min-h-40"
              />
            ) : (
              rows.map((row) => {
                const key = `${row.mosqueId}-${row.intentId}`;
                const busy = actingKey === key;
                return (
                  <Card key={key} className="border-border">
                    <CardContent className="space-y-3 pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-semibold text-foreground">{row.mosqueName}</p>
                          <p className="font-semibold text-foreground">{formatCurrency(Number(row.amount), 'â‚¹')}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">{row.intentId}</p>
                          <Badge variant="secondary" className="text-xs">{row.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{row.duration} days â€¢ {formatDateTime(row.createdAt)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/platform/payments/${row.id}`}>Details</Link>
                        </Button>
                        {row.proofUrl ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={row.proofUrl}>Proof</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>No Proof</Button>
                        )}
                        <Button size="sm" disabled={busy || row.status === 'VERIFIED'} onClick={() => verify(row)}>
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || row.status === 'REJECTED'}
                          onClick={() => reject(row)}
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Mosque</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Intent ID</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Proof</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4">
                      <ListEmptyState
                        title="No payments found"
                        description={mosqueIdFilter ? 'No queued payments for this mosque yet.' : 'Payments will appear here once mosques submit proof.'}
                        actionLabel={mosqueIdFilter ? 'View All Payments' : 'View Mosques'}
                        actionHref={mosqueIdFilter ? '/platform/payments' : '/platform/mosques'}
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const key = `${row.mosqueId}-${row.intentId}`;
                    const busy = actingKey === key;
                    return (
                      <tr key={key} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{row.mosqueName}</td>
                        <td className="px-3 py-2">{row.duration} days</td>
                        <td className="px-3 py-2">{row.intentId}</td>
                        <td className="px-3 py-2">{formatCurrency(Number(row.amount), 'â‚¹')}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">
                          {row.proofUrl ? (
                            <Link href={row.proofUrl} className="text-primary underline">
                              Open proof
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/platform/payments/${row.id}`}>Open</Link>
                          </Button>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button size="sm" disabled={busy || row.status === 'VERIFIED'} onClick={() => verify(row)}>
                              Verify
                            </Button>
                            <ActionOverflowMenu
                              items={[
                                {
                                  label: 'Reject',
                                  onSelect: () => reject(row),
                                  destructive: true,
                                  disabled: busy || row.status === 'REJECTED',
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {meta.page} of {Math.max(meta.totalPages, 1)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage || loading} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNextPage || loading} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


