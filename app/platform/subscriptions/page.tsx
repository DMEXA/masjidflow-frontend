'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  platformAdminService,
  type PaginationMeta,
  type PlatformSubscriptionRow,
} from '@/services/platform-admin.service';
import { formatDateTime } from '@/src/utils/format';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSafeLimit } from '@/src/utils/pagination';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const pageLimit = getSafeLimit(20);

  const subscriptionsQuery = useQuery<{ data: PlatformSubscriptionRow[]; meta: PaginationMeta }>({
    queryKey: queryKeys.platformSubscriptions({ page, limit: pageLimit, status: 'all' }),
    queryFn: () => platformAdminService.getMosqueBilling({ page, limit: pageLimit }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rows = subscriptionsQuery.data?.data ?? [];
  const meta = subscriptionsQuery.data?.meta ?? EMPTY_META;
  const loading = subscriptionsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Subscriptions" description="Single subscription model with fixed durations" />

      <Card>
        <CardHeader>
          <CardTitle>Active Duration Options</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">1 Month</p>
            <p className="mt-1 text-base font-semibold">Code: SUBSCRIPTION_1M</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">6 Months</p>
            <p className="mt-1 text-base font-semibold">Code: SUBSCRIPTION_6M</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">12 Months</p>
            <p className="mt-1 text-base font-semibold">Code: SUBSCRIPTION_12M</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mosque Billing View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            ) : rows.length === 0 ? (
              <ListEmptyState
                title="No billing records yet"
                description="Billing history appears after the first subscription payment."
                actionLabel="Open Payments"
                actionHref="/platform/payments"
                className="min-h-40"
              />
            ) : (
              rows.map((row) => (
                <Card key={row.id} className="border-border">
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base font-semibold text-foreground">{row.mosqueName}</p>
                      <Badge variant="secondary" className="text-xs">{row.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Expiry: {row.endDate ? formatDateTime(row.endDate) : '-'}</span>
                      <span>Plan: {row.plan}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Mosque</th>
                  <th className="px-3 py-2">Current Plan</th>
                  <th className="px-3 py-2">Expiry Date</th>
                  <th className="px-3 py-2">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4">
                      <ListEmptyState
                        title="No billing records yet"
                        description="Billing history appears after the first subscription payment."
                        actionLabel="Open Payments"
                        actionHref="/platform/payments"
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{row.mosqueName}</td>
                      <td className="px-3 py-2">{row.plan}</td>
                      <td className="px-3 py-2">{row.endDate ? formatDateTime(row.endDate) : '-'}</td>
                      <td className="px-3 py-2">{row.status}</td>
                    </tr>
                  ))
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


