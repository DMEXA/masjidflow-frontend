'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import {
  platformAdminService,
  type PlatformSubscriptionPaymentDetails,
} from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatDateTime } from '@/src/utils/format';

export default function PlatformPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const paymentId = params?.id;

  const [details, setDetails] = useState<PlatformSubscriptionPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const data = await platformAdminService.getSubscriptionPaymentById(paymentId);
      setDetails(data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load payment details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [paymentId]);

  const verify = async () => {
    if (!details) return;

    setActing(true);
    try {
      const updated = await platformAdminService.verifySubscriptionPayment(details.mosqueId, details.intentId);
      setDetails((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Payment verified');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify payment'));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!details) return;

    setActing(true);
    try {
      await platformAdminService.rejectSubscriptionPayment(details.mosqueId, details.intentId);
      await load();
      toast.success('Payment rejected');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject payment'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Details"
        description="Proof review and one-click verification actions"
        backHref="/platform/payments"
        backLabel="Back to Payments"
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
            </div>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">Payment not found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Mosque</p>
                <p className="text-base font-semibold">{details.mosqueName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Intent ID</p>
                <p className="text-base font-semibold">{details.intentId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-base font-semibold">{details.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-base font-semibold">{formatCurrency(Number(details.amount), '₹')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-base font-semibold">{details.duration} days</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-base font-semibold">{formatDateTime(details.createdAt)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {details ? (
        <Card>
          <CardHeader>
            <CardTitle>Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {details.proofUrl ? (
              <>
                <Link href={details.proofUrl} className="text-sm text-primary underline">
                  Open Proof Image
                </Link>
                { }
                <img
                  src={details.proofUrl}
                  alt="Subscription proof"
                  className="max-h-80 w-full rounded-lg border border-border object-contain"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No proof image uploaded.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={verify} disabled={acting || details.status === 'VERIFIED'}>
                Verify Payment
              </Button>
              <ActionOverflowMenu
                items={[
                  {
                    label: 'Reject Payment',
                    onSelect: reject,
                    destructive: true,
                    disabled: acting || details.status === 'REJECTED',
                  },
                  { label: 'Open Mosque', onSelect: () => router.push(`/platform/mosques/${details.mosqueId}`) },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
