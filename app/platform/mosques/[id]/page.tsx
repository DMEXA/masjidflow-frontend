'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformAdminService, type PlatformMosqueDetails } from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatDateTime } from '@/src/utils/format';
import { ListEmptyState } from '@/components/common/list-empty-state';

export default function PlatformMosqueDetailsPage() {
  const params = useParams<{ id: string }>();
  const mosqueId = params?.id;

  const [details, setDetails] = useState<PlatformMosqueDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!mosqueId) return;

    setLoading(true);
    try {
      const data = await platformAdminService.getMosqueDetails(mosqueId);
      setDetails(data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load mosque details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mosqueId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mosque Billing Details"
        description="Mosque profile, subscription status, and payment history"
        backHref="/platform/mosques"
        backLabel="Back to Mosques"
      />

      <Card>
        <CardHeader>
          <CardTitle>Mosque Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
            </div>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">Mosque not found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-base font-semibold">{details.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <p className="text-base font-semibold">{details.slug}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-base font-semibold">{details.isSuspended ? 'Suspended' : 'Active'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin</p>
                <p className="text-base font-semibold">{details.admin?.email ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-base font-semibold">{details.memberCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-base font-semibold">{formatDateTime(details.createdAt)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {!details?.subscription ? (
            <p className="text-sm text-muted-foreground">No active subscription record.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-base font-semibold">{details.subscription.plan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-base font-semibold">{details.subscription.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiry</p>
                <p className="text-base font-semibold">
                  {details.subscription.endDate ? formatDateTime(details.subscription.endDate) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-base font-semibold">
                  {details.subscription.price != null ? formatCurrency(Number(details.subscription.price), '₹') : '-'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!details || details.paymentHistory.length === 0 ? (
            <ListEmptyState
              title="No payment records yet"
              description="Payments will appear after subscription checkout starts."
              actionLabel="View All Payments"
              actionHref="/platform/payments"
              className="min-h-40"
            />
          ) : (
            <div className="space-y-3">
              {details.paymentHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{item.intentId}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(Number(item.amount), '₹')} | {item.status} | {formatDateTime(item.createdAt)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/platform/payments/${item.id}`}>Open Payment</Link>
                    </Button>
                    {item.proofUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={item.proofUrl}>Open Proof</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
