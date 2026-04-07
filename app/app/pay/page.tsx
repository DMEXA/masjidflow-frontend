'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { muqtadisService, type MyDuesResponse } from '@/services/muqtadis.service';
import { donationsService } from '@/services/donations.service';
import { paymentSettingsService } from '@/services/payment-settings.service';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency, formatCycleLabel, getCycleStatus } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

type SortOrder = 'newest' | 'oldest';
type PaymentMethod = 'UPI' | 'BANK' | 'PHONE';

export default function PayPage() {
  const { user, mosque } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [reference, setReference] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showProofStep, setShowProofStep] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{
    upiId?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    phoneNumber?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadPaymentConfig = async () => {
      if (!mosque?.id) return;
      try {
        const config = await paymentSettingsService.get();
        setPaymentConfig({
          upiId: config?.upiId ?? null,
          bankAccount: config?.bankAccount ?? null,
          ifsc: config?.ifsc ?? null,
          phoneNumber: config?.phoneNumber ?? config?.adminWhatsappNumber ?? null,
        });
      } catch {
        setPaymentConfig(null);
      }
    };

    void loadPaymentConfig();
  }, [mosque?.id]);

  const duesQuery = useQuery<MyDuesResponse>({
    queryKey: queryKeys.muqtadiDues(user?.id),
    queryFn: () => muqtadisService.getMyDues({ page: 1, limit: 20 }),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const dues = duesQuery.data?.data ?? [];

  useEffect(() => {
    if (duesQuery.error) {
      toast.error(getErrorMessage(duesQuery.error, 'Failed to load dues'));
    }
  }, [duesQuery.error]);

  const selectedDue = useMemo(
    () => dues.find((due) => due.cycleId === selectedCycleId) ?? null,
    [dues, selectedCycleId],
  );

  const selectedMonthLabel = useMemo(() => {
    if (!selectedDue) return 'Select month';

    const remaining = Math.max(selectedDue.expectedAmount - selectedDue.paidAmount, 0);
    const isPaid = selectedDue.status === 'PAID';

    return isPaid
      ? `${formatCycleLabel(selectedDue.month, selectedDue.year)} (Paid)`
      : `${formatCycleLabel(selectedDue.month, selectedDue.year)} (${getCycleStatus(selectedDue.month, selectedDue.year)}) - due ${formatCurrency(remaining)}`;
  }, [selectedDue]);

  const sortedDues = useMemo(() => {
    return [...dues].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [dues, sortOrder]);

  const currentDue = useMemo(() => {
    return Number(duesQuery.data?.summary?.outstandingAmount ?? 0);
  }, [duesQuery.data?.summary?.outstandingAmount]);

  const availableMethods = useMemo<PaymentMethod[]>(() => {
    if (!paymentConfig) return [];
    const methods: PaymentMethod[] = [];
    if (paymentConfig.upiId?.trim()) methods.push('UPI');
    if (paymentConfig.bankAccount?.trim()) methods.push('BANK');
    if (paymentConfig.phoneNumber?.trim()) methods.push('PHONE');
    return methods;
  }, [paymentConfig]);

  const selectedMethodDetails = useMemo(() => {
    if (!paymentConfig || !selectedMethod) return null;

    if (selectedMethod === 'UPI') {
      return paymentConfig.upiId ? `UPI ID: ${paymentConfig.upiId}` : null;
    }

    if (selectedMethod === 'BANK') {
      if (!paymentConfig.bankAccount) return null;
      return paymentConfig.ifsc
        ? `Account: ${paymentConfig.bankAccount} | IFSC: ${paymentConfig.ifsc}`
        : `Account: ${paymentConfig.bankAccount}`;
    }

    return paymentConfig.phoneNumber ? `Phone: ${paymentConfig.phoneNumber}` : null;
  }, [paymentConfig, selectedMethod]);

  const onHavePaid = () => {
    const numericAmount = parseStrictAmountInput(amount);

    if (!selectedCycleId || numericAmount === null || numericAmount <= 0) {
      toast.error('Select a month and enter a valid amount');
      return;
    }

    if (selectedDue?.status === 'PAID') {
      toast.error('This month is already fully paid');
      return;
    }

    if (!selectedMethod) {
      toast.error('Select a payment method');
      return;
    }

    setShowProofStep(true);
  };

  const onSubmitProof = async () => {
    const numericAmount = parseStrictAmountInput(amount);

    if (!selectedCycleId || numericAmount === null || numericAmount <= 0) {
      toast.error('Select a month and enter a valid amount');
      return;
    }

    if (!selectedMethod) {
      toast.error('Select a payment method');
      return;
    }

    if (!screenshot) {
      toast.error('Upload payment screenshot to submit payment');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(screenshot.type)) {
      toast.error('Screenshot must be JPG or PNG');
      return;
    }

    if (screenshot.size > 2 * 1024 * 1024) {
      toast.error('Screenshot must be up to 2MB');
      return;
    }

    setSubmitting(true);
    try {
      setUploadingScreenshot(true);
      const uploaded = await donationsService.uploadDonationScreenshot(screenshot, mosque?.id);
      setUploadingScreenshot(false);

      await muqtadisService.initiateMyPayment({
        cycleId: selectedCycleId,
        amount: numericAmount,
        utr: utr.trim() || undefined,
        reference: reference.trim() || selectedMethod,
        screenshotUrl: uploaded.url,
      });

      toast.success('Payment submitted for verification');
      setScreenshot(null);
      setUtr('');
      setReference('');
      setShowProofStep(false);
      await duesQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit payment'));
    } finally {
      setUploadingScreenshot(false);
      setSubmitting(false);
    }
  };

  if (duesQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <div className="rounded-xl border p-4">
        <MuqtadiBackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Contribution</CardTitle>
          <CardDescription>Choose payment method, pay externally, then upload screenshot for admin verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Current Due</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(currentDue)}</p>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <div className="mb-2 w-full max-w-full">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={sortOrder === 'newest' ? 'default' : 'outline'}
                  className="h-11 w-full"
                  onClick={() => setSortOrder('newest')}
                >
                  Newest
                </Button>
                <Button
                  type="button"
                  variant={sortOrder === 'oldest' ? 'default' : 'outline'}
                  className="h-11 w-full"
                  onClick={() => setSortOrder('oldest')}
                >
                  Oldest
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between text-left"
              onClick={() => setIsMonthSheetOpen(true)}
            >
              <span className="w-full whitespace-normal wrap-break-word">{selectedMonthLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>

            <Sheet open={isMonthSheetOpen} onOpenChange={setIsMonthSheetOpen}>
              <SheetContent side="bottom" className="inset-x-0 w-full max-w-full rounded-t-2xl p-0">
                <SheetHeader className="border-b ds-section">
                  <SheetTitle>Select Month</SheetTitle>
                </SheetHeader>

                <div className="w-full max-w-full px-3 py-3">
                  <div className="max-h-62.5 w-full overflow-y-auto">
                    <div className="space-y-2">
                      {sortedDues.map((due) => {
                        const isPaid = due.status === 'PAID';
                        const dueAmount = Math.max(due.expectedAmount - due.paidAmount, 0);
                        const optionLabel = isPaid
                          ? `${formatCycleLabel(due.month, due.year)} (Paid)`
                          : `${formatCycleLabel(due.month, due.year)} (${getCycleStatus(due.month, due.year)}) - due ${formatCurrency(dueAmount)}`;
                        const isSelected = selectedCycleId === due.cycleId;

                        return (
                          <Button
                            key={due.id}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            disabled={isPaid}
                            onClick={() => {
                              setSelectedCycleId(due.cycleId);
                              setIsMonthSheetOpen(false);
                            }}
                            className="h-auto w-full items-start justify-between gap-3 text-left"
                          >
                            <span className="whitespace-normal wrap-break-word">{optionLabel}</span>
                            {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="text" inputMode="decimal" pattern="^\d+(?:\.\d{1,2})?$" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {availableMethods.map((method) => (
                <Button
                  key={method}
                  type="button"
                  variant={selectedMethod === method ? 'default' : 'outline'}
                  onClick={() => setSelectedMethod(method)}
                >
                  {method}
                </Button>
              ))}
            </div>
            {!availableMethods.length ? (
              <p className="text-xs text-muted-foreground">No payment methods configured yet.</p>
            ) : null}
          </div>

          {selectedMethodDetails ? (
            <div className="rounded-xl border p-3 text-sm">
              <p className="font-medium">Payment Details</p>
              <p className="mt-1">{selectedMethodDetails}</p>
            </div>
          ) : null}

          {!showProofStep ? (
            <Button onClick={onHavePaid} disabled={submitting || !availableMethods.length} className="h-11 w-full text-base font-semibold">
              I HAVE PAID
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border p-3">
              <div className="space-y-2">
                <Label>Screenshot (JPG/PNG, max 2MB)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-2">
                <Label>UTR (optional)</Label>
                <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter transaction ID (UTR)" />
              </div>

              <div className="space-y-2">
                <Label>Reference (optional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              <Button onClick={onSubmitProof} disabled={submitting} className="h-11 w-full text-base font-semibold">
                {submitting || uploadingScreenshot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {uploadingScreenshot ? 'Uploading Screenshot...' : 'Submit Payment'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
