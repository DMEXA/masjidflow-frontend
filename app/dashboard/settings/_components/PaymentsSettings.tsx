'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { paymentSettingsService } from '@/services/payment-settings.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';
import { invalidateMosqueLiveQueries } from '@/lib/realtime-invalidation';
import { queryKeys } from '@/lib/query-keys';

export function PaymentsSettings() {
  const queryClient = useQueryClient();
  const fieldClass = 'w-full rounded-xl px-4 py-3';
  const { mosque: currentMosque } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_upi: '',
    phone_number: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    payment_instructions: '',
  });
  const [snapshotPaymentForm, setSnapshotPaymentForm] = useState(paymentForm);

  const paymentSettingsQuery = useQuery({
    queryKey: queryKeys.paymentSettings(currentMosque?.id),
    queryFn: () => paymentSettingsService.get(),
    enabled: Boolean(currentMosque?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });

  useEffect(() => {
    if (paymentSettingsQuery.error) {
      toast.error(getErrorMessage(paymentSettingsQuery.error, 'Failed to load payment settings'));
    }
  }, [paymentSettingsQuery.error]);

  useEffect(() => {
    const saved = paymentSettingsQuery.data;
    if (!saved) {
      return;
    }

    const nextForm = {
      payment_upi: saved.upiId ?? '',
      phone_number: saved.phoneNumber ?? saved.adminWhatsappNumber ?? '',
      bank_account_name: saved.bankAccountName ?? '',
      bank_account_number: saved.bankAccount ?? '',
      bank_ifsc: saved.ifsc ?? '',
      bank_name: saved.bankName ?? '',
      payment_instructions: saved.paymentInstructions ?? '',
    };
    setPaymentForm(nextForm);
    setSnapshotPaymentForm(nextForm);
  }, [paymentSettingsQuery.data]);

  const handleSavePaymentSettings = async () => {
    const mosqueId = currentMosque?.id;
    if (!mosqueId) {
      toast.error('Mosque not found');
      return;
    }

    const upi = paymentForm.payment_upi.trim();
    const phoneNumber = paymentForm.phone_number.trim();
    const bankAccountName = paymentForm.bank_account_name.trim();
    const bankAccountNumber = paymentForm.bank_account_number.trim();
    const bankIfsc = paymentForm.bank_ifsc.trim().toUpperCase();
    const bankName = paymentForm.bank_name.trim();
    const instructions = paymentForm.payment_instructions.trim();

    if (upi && !/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      toast.error('Invalid UPI ID format');
      return;
    }

    if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      toast.error('Invalid IFSC code');
      return;
    }

    if (bankAccountNumber && !/^\d{8,18}$/.test(bankAccountNumber)) {
      toast.error('Invalid account number');
      return;
    }

    if (!upi && !bankAccountNumber) {
      toast.error('At least one payment method is required');
      return;
    }

    if (phoneNumber && !/^\+?[1-9]\d{9,14}$/.test(phoneNumber)) {
      toast.error('Invalid phone number format');
      return;
    }

    setPaymentSaving(true);
    try {
      const existing = await paymentSettingsService.get();

      await paymentSettingsService.upsert({
        upiId: upi || undefined,
        upiName: existing?.upiName?.trim() || currentMosque?.name || 'Mosque',
        phoneNumber: phoneNumber || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccount: bankAccountNumber || undefined,
        ifsc: bankIfsc || undefined,
        bankName: bankName || undefined,
        paymentInstructions: instructions || undefined,
        qrLogo: existing?.qrLogo || undefined,
      });

      toast.success('Payment settings updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentSettings(mosqueId) });
      await invalidateMosqueLiveQueries(queryClient, mosqueId);
      setSnapshotPaymentForm(paymentForm);
      setIsEditing(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update payment settings'));
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleCancel = () => {
    setPaymentForm(snapshotPaymentForm);
    setIsEditing(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Manage donation payment details for this mosque.</CardDescription>
          </div>
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
          <p className="font-medium">Read-only summary</p>
          <p><span className="text-muted-foreground">UPI:</span> {paymentForm.payment_upi || 'Not set'}</p>
          <p><span className="text-muted-foreground">Phone:</span> {paymentForm.phone_number || 'Not set'}</p>
          <p><span className="text-muted-foreground">Bank:</span> {paymentForm.bank_name || 'Not set'}</p>
        </section>

        <div className="space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground">Pay via UPI</h3>
          <div className="space-y-2">
            <Label htmlFor="payment-upi">UPI ID (optional)</Label>
            <Input
              id="payment-upi"
              className={fieldClass}
              placeholder="example@upi"
              value={paymentForm.payment_upi}
              disabled={!isEditing}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_upi: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-phone">Phone Number (optional)</Label>
            <Input
              id="payment-phone"
              className={fieldClass}
              placeholder="+919876543210"
              value={paymentForm.phone_number}
              disabled={!isEditing}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, phone_number: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-foreground">Pay via Bank Transfer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-account-name">Account Holder Name</Label>
              <Input
                id="bank-account-name"
                className={fieldClass}
                value={paymentForm.bank_account_name}
                disabled={!isEditing}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, bank_account_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-account-number">Account Number</Label>
              <Input
                id="bank-account-number"
                className={fieldClass}
                value={paymentForm.bank_account_number}
                disabled={!isEditing}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-ifsc">IFSC Code</Label>
              <Input
                id="bank-ifsc"
                className={fieldClass}
                value={paymentForm.bank_ifsc}
                disabled={!isEditing}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, bank_ifsc: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input
                id="bank-name"
                className={fieldClass}
                value={paymentForm.bank_name}
                disabled={!isEditing}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, bank_name: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-instructions">Payment Instructions (optional)</Label>
          <Textarea
            id="payment-instructions"
            className={fieldClass}
            rows={4}
            placeholder="Share any additional payment note for donors"
            value={paymentForm.payment_instructions}
            disabled={!isEditing}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_instructions: e.target.value }))}
          />
        </div>

        {isEditing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={paymentSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSavePaymentSettings()} disabled={paymentSaving}>
              {paymentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
