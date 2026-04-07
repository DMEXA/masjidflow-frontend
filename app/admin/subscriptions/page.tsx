'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformAdminService, type PlatformSubscriptionRow, type PaginationMeta } from '@/services/platform-admin.service';
import { formatCurrency, formatDateTime } from '@/src/utils/format';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformAdminSubscriptionsPage() {
  const [rows, setRows] = useState<PlatformSubscriptionRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await platformAdminService.getSubscriptions({ page, limit: 20 });
      setRows(response.data);
      setMeta(response.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Platform-wide subscription records"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="ds-section font-medium">Mosque</th>
                  <th className="ds-section font-medium">Plan</th>
                  <th className="ds-section font-medium">Status</th>
                  <th className="ds-section font-medium">Start</th>
                  <th className="ds-section font-medium">End</th>
                  <th className="ds-section font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-4 py-6" colSpan={6}>
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6" colSpan={6}>
                      <ListEmptyState
                        title="No subscriptions found"
                        description="Subscription records appear after the first billing cycle."
                        actionLabel="Reload List"
                        onAction={() => load(1)}
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="ds-section">{row.mosqueName}</td>
                      <td className="ds-section">{row.plan}</td>
                      <td className="ds-section">{row.status}</td>
                      <td className="ds-section">{formatDateTime(row.startDate)}</td>
                      <td className="ds-section">{row.endDate ? formatDateTime(row.endDate) : '-'}</td>
                      <td className="ds-section">{row.price !== null ? formatCurrency(Number(row.price), '₹') : '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {meta.page} of {Math.max(meta.totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!meta.hasPreviousPage || loading}
            onClick={() => load(meta.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!meta.hasNextPage || loading}
            onClick={() => load(meta.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
