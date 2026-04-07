'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { platformAdminService } from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { isStrictAmountString } from '@/src/utils/numeric-input';

export default function PlatformSettingsPage() {
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    basePrice: '',
    price1Month: '',
    price6Months: '',
    price12Months: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    upiId: '',
    upiName: '',
    bankAccount: '',
    ifsc: '',
    bankName: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await platformAdminService.getPlatformPaymentSettings();
        if (!settings) return;
        setSubscriptionForm({
          basePrice: settings.basePrice != null ? String(settings.basePrice) : '',
          price1Month:
            settings.subscription?.monthly != null
              ? String(settings.subscription.monthly)
              : settings.price1Month != null
                ? String(settings.price1Month)
                : '',
          price6Months:
            settings.subscription?.sixMonths != null
              ? String(settings.subscription.sixMonths)
              : settings.price6Months != null
                ? String(settings.price6Months)
                : '',
          price12Months:
            settings.subscription?.yearly != null
              ? String(settings.subscription.yearly)
              : settings.price12Months != null
                ? String(settings.price12Months)
                : '',
        });
        setPaymentForm({
          upiId: settings.upiId || '',
          upiName: settings.upiName || '',
          bankAccount: settings.bankAccount || '',
          ifsc: settings.ifsc || '',
          bankName: settings.bankName || '',
        });
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load platform payment settings'));
      }
    };

    load();
  }, []);

  const validateSubscriptionSettings = () => {
    const values = [
      subscriptionForm.basePrice,
      subscriptionForm.price1Month,
      subscriptionForm.price6Months,
      subscriptionForm.price12Months,
    ]
      .filter((value) => value.trim().length > 0)
      .map((value) => value.trim());

    if (values.some((value) => !isStrictAmountString(value) || value === '0' || value === '0.0' || value === '0.00')) {
      toast.error('Subscription prices must be valid positive numbers');
      return false;
    }
    return true;
  };

  const validatePaymentSettings = () => {
    if (!paymentForm.upiId.trim() || !paymentForm.upiName.trim()) {
      toast.error('UPI ID and UPI name are required');
      return false;
    }
    return true;
  };

  const saveSubscriptionSettings = async () => {
    if (!validateSubscriptionSettings()) {
      return;
    }

    setIsSavingSubscription(true);
    try {
      await platformAdminService.upsertPlatformSubscriptionSettings({
        basePrice: subscriptionForm.basePrice ? subscriptionForm.basePrice.trim() : undefined,
        price1Month: subscriptionForm.price1Month ? subscriptionForm.price1Month.trim() : undefined,
        price6Months: subscriptionForm.price6Months ? subscriptionForm.price6Months.trim() : undefined,
        price12Months: subscriptionForm.price12Months ? subscriptionForm.price12Months.trim() : undefined,
      });
      toast.success('Subscription settings updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update subscription settings'));
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const savePaymentSettings = async () => {
    if (!validatePaymentSettings()) {
      return;
    }

    setIsSavingPayment(true);
    try {
      await platformAdminService.upsertPlatformPaymentMethodSettings({
        upiId: paymentForm.upiId.trim(),
        upiName: paymentForm.upiName.trim(),
        bankAccount: paymentForm.bankAccount.trim() || undefined,
        ifsc: paymentForm.ifsc.trim() || undefined,
        bankName: paymentForm.bankName.trim() || undefined,
      });
      toast.success('Payment settings updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update payment settings'));
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Settings" description="UPI and bank details used for mosque subscription payments" />
      <Card>
        <CardHeader>
          <CardTitle>Subscription Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Base Monthly Price"
            inputMode="decimal"
            value={subscriptionForm.basePrice}
            onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, basePrice: e.target.value }))}
          />
          <Input
            placeholder="Monthly"
            inputMode="decimal"
            value={subscriptionForm.price1Month}
            onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, price1Month: e.target.value }))}
          />
          <Input
            placeholder="6 Months"
            inputMode="decimal"
            value={subscriptionForm.price6Months}
            onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, price6Months: e.target.value }))}
          />
          <Input
            placeholder="Yearly"
            inputMode="decimal"
            value={subscriptionForm.price12Months}
            onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, price12Months: e.target.value }))}
          />
          <div className="md:col-span-2">
            <Button onClick={saveSubscriptionSettings} disabled={isSavingSubscription}>
              {isSavingSubscription ? 'Saving...' : 'Save Subscription Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Primary method: UPI. Fallback method: bank transfer.
          </div>
          <Input placeholder="UPI ID" value={paymentForm.upiId} onChange={(e) => setPaymentForm((prev) => ({ ...prev, upiId: e.target.value }))} />
          <Input placeholder="UPI Name" value={paymentForm.upiName} onChange={(e) => setPaymentForm((prev) => ({ ...prev, upiName: e.target.value }))} />
          <Input placeholder="Bank Account (fallback)" value={paymentForm.bankAccount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankAccount: e.target.value }))} />
          <Input placeholder="IFSC (fallback)" value={paymentForm.ifsc} onChange={(e) => setPaymentForm((prev) => ({ ...prev, ifsc: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="Bank Name" value={paymentForm.bankName} onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))} />
          <div className="md:col-span-2">
            <Button onClick={savePaymentSettings} disabled={isSavingPayment}>{isSavingPayment ? 'Saving...' : 'Save Payment Settings'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
