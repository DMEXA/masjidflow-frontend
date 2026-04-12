'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronDown, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { muqtadisService, type MuqtadiDashboardApiResponse, type MyDuesResponse } from '@/services/muqtadis.service';
import { donationsService } from '@/services/donations.service';
import { paymentSettingsService } from '@/services/payment-settings.service';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency, formatCycleLabel, getCycleStatus } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';
import { openExternalUrl } from '@/src/utils/open-external-url';
import { launchUpiDeepLink } from '@/src/utils/upi-launch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { QRCodeSVG } from 'qrcode.react';
import { useProfileQuery } from '@/hooks/useProfileQuery';

type SortOrder = 'newest' | 'oldest';
type PaymentMethod = 'UPI' | 'BANK' | 'PHONE';

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileRegex = /android|iphone|ipad|ipod|opera mini|iemobile|mobile/;
  return mobileRegex.test(userAgent);
}

function buildUpiDeepLink(input: { upiId: string; payeeName: string; amount: number; note: string }): string {
  const params = new URLSearchParams({
    pa: input.upiId.trim(),
    pn: input.payeeName.trim(),
    am: input.amount.toFixed(2),
    cu: 'INR',
    tn: input.note.trim(),
  });
  return `upi://pay?${params.toString()}`;
}

function toShortName(name?: string | null): string {
  const normalized = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Muqtadi';
  return normalized.length > 18 ? `${normalized.slice(0, 18).trim()}...` : normalized;
}

function buildUpiVerificationNote(input: {
  month?: number | null;
  year?: number | null;
  payerName?: string | null;
  householdMembers?: number | null;
}): string {
  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();
  const monthLabel = new Date(year, Math.max(0, Math.min(11, month - 1)), 1).toLocaleString('en-US', {
    month: 'short',
  });
  const shortYear = String(year).slice(-2);

  const parts = [`Due ${monthLabel}-${shortYear}`, toShortName(input.payerName)];
  if (typeof input.householdMembers === 'number' && Number.isFinite(input.householdMembers) && input.householdMembers > 0) {
    parts.push(`HH${Math.trunc(input.householdMembers)}`);
  }

  const note = parts.join(' ');
  return note.length > 80 ? `${note.slice(0, 80).trim()}...` : note;
}

export default function PayPage() {
  const { user, mosque } = useAuthStore();
  const queryClient = useQueryClient();
  const profileQuery = useProfileQuery(Boolean(user?.id));
  const searchParams = useSearchParams();
  const resumeProofMode = searchParams.get('resumeProof') === '1';
  const requestedPaymentId = searchParams.get('paymentId')?.trim() ?? '';
  const requestedCycleId = searchParams.get('cycleId')?.trim() ?? '';
  const requestedDueId = searchParams.get('dueId')?.trim() ?? '';
  const requestedMethod = searchParams.get('method')?.trim().toUpperCase() ?? '';

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
  const [showDesktopUpiModal, setShowDesktopUpiModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedDueId, setSelectedDueId] = useState('');
  const [existingScreenshotUrl, setExistingScreenshotUrl] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<{
    upiId?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    phoneNumber?: string | null;
  } | null>(null);
  const [appliedResumeDefaults, setAppliedResumeDefaults] = useState(false);
  const [resumeBlocked, setResumeBlocked] = useState(false);
  const [exactResumeMatched, setExactResumeMatched] = useState(false);

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

  const dashboardQuery = useQuery<MuqtadiDashboardApiResponse>({
    queryKey: queryKeys.muqtadiDashboard(mosque?.id),
    queryFn: () => muqtadisService.getDashboard(),
    enabled: Boolean(user?.id && mosque?.id && resumeProofMode),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const dues = useMemo(() => duesQuery.data?.data ?? [], [duesQuery.data?.data]);
  const historyRows = useMemo(() => dashboardQuery.data?.history ?? [], [dashboardQuery.data?.history]);

  useEffect(() => {
    if (duesQuery.error) {
      toast.error(getErrorMessage(duesQuery.error, 'Failed to load dues'));
    }
  }, [duesQuery.error]);

  useEffect(() => {
    if (dashboardQuery.error && resumeProofMode) {
      toast.error(getErrorMessage(dashboardQuery.error, 'Failed to load payment history for retry'));
    }
  }, [dashboardQuery.error, resumeProofMode]);

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
  const allDuesPaid = currentDue <= 0.0001;

  const remainingDue = useMemo(() => {
    if (!selectedDue) return 0;
    return Number(Math.max(selectedDue.expectedAmount - selectedDue.paidAmount, 0).toFixed(2));
  }, [selectedDue]);

  const parsedAmount = useMemo(() => parseStrictAmountInput(amount), [amount]);
  const amountIsValid = parsedAmount !== null && parsedAmount > 0;
  const amountExceedsRemaining = amountIsValid && selectedDue ? (parsedAmount as number) > remainingDue : false;

  const upiDeepLink = useMemo(() => {
    if (!paymentConfig?.upiId?.trim()) return '';
    if (!amountIsValid || !parsedAmount) return '';
    const payeeName = (mosque?.name || 'MasjidLedger').trim();
    const note = buildUpiVerificationNote({
      month: selectedDue?.month,
      year: selectedDue?.year,
      payerName: profileQuery.data?.name ?? user?.name,
      householdMembers: profileQuery.data?.householdMembers,
    });
    return buildUpiDeepLink({
      upiId: paymentConfig.upiId.trim(),
      payeeName,
      amount: parsedAmount,
      note,
    });
  }, [
    amountIsValid,
    mosque?.name,
    parsedAmount,
    paymentConfig?.upiId,
    profileQuery.data?.householdMembers,
    profileQuery.data?.name,
    selectedDue?.month,
    selectedDue?.year,
    user?.name,
  ]);

  const upiVerificationNote = useMemo(
    () => buildUpiVerificationNote({
      month: selectedDue?.month,
      year: selectedDue?.year,
      payerName: profileQuery.data?.name ?? user?.name,
      householdMembers: profileQuery.data?.householdMembers,
    }),
    [profileQuery.data?.householdMembers, profileQuery.data?.name, selectedDue?.month, selectedDue?.year, user?.name],
  );

  useEffect(() => {
    if (!selectedDue) {
      if (!(resumeProofMode && exactResumeMatched)) {
        setAmount('');
      }
      return;
    }
    if (selectedDue.status === 'PAID' || remainingDue <= 0) {
      setAmount('0');
      return;
    }
    setAmount(String(remainingDue));
  }, [exactResumeMatched, remainingDue, resumeProofMode, selectedDue]);

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

  const copyValue = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  useEffect(() => {
    if (appliedResumeDefaults) return;
    if (!dues.length && !(resumeProofMode && requestedPaymentId)) return;
    if (resumeProofMode && requestedPaymentId && dashboardQuery.isLoading) return;

    const requestedPayment = requestedPaymentId
      ? (historyRows.find((row) => row.id === requestedPaymentId) ?? null)
      : null;

    if (resumeProofMode && requestedPaymentId && !requestedPayment) {
      toast.error('Payment not found for retry. Select month and continue.');
    }

    if (requestedPayment?.status === 'VERIFIED') {
      toast.error('This payment is already verified. Retry is blocked.');
      setResumeBlocked(true);
      setShowProofStep(false);
      setAppliedResumeDefaults(true);
      return;
    }

    const requestedPaymentStatus = (requestedPayment?.status ?? '').toUpperCase();
    const isRetryableResumePayment = requestedPaymentStatus === 'PENDING' || requestedPaymentStatus === 'REJECTED';
    if (resumeProofMode && requestedPayment && isRetryableResumePayment) {
      if (requestedPayment.cycleId) {
        setSelectedCycleId(requestedPayment.cycleId);
        if (requestedPayment.dueId) {
          setSelectedDueId(requestedPayment.dueId);
        }
        setExactResumeMatched(true);
        setShowProofStep(true);

        const methodFromPayment = (requestedPayment.method ?? '').toUpperCase();
        const preferredMethod = requestedMethod || methodFromPayment;
        if (preferredMethod && ['UPI', 'BANK', 'PHONE'].includes(preferredMethod)) {
          setSelectedMethod(preferredMethod as PaymentMethod);
        }

        if (requestedPayment.utr) {
          setUtr(String(requestedPayment.utr));
        }
        if (requestedPayment.screenshotUrl) {
          setExistingScreenshotUrl(String(requestedPayment.screenshotUrl));
        }

        setAppliedResumeDefaults(true);
        return;
      }

      toast.error('Payment context is incomplete. Please select a month and continue.');
    }

    const cycleIdCandidate = requestedCycleId || requestedPayment?.cycleId || '';
    let matchedDue = requestedDueId
      ? dues.find((due) => due.id === requestedDueId) ?? null
      : null;

    if (!matchedDue && cycleIdCandidate) {
      matchedDue = dues.find((due) => due.cycleId === cycleIdCandidate) ?? null;
    }

    if (
      matchedDue
      && matchedDue.status !== 'PAID'
      && Math.max(matchedDue.expectedAmount - matchedDue.paidAmount, 0) > 0
    ) {
      setSelectedCycleId(matchedDue.cycleId);
      setSelectedDueId(matchedDue.id);
      setExactResumeMatched(Boolean(requestedPaymentId || requestedDueId || requestedCycleId));
    } else if (resumeProofMode && (requestedPaymentId || requestedDueId || requestedCycleId)) {
      toast.error('Selected due is no longer payable. Please choose another month.');
    } else if (resumeProofMode) {
      const firstPendingDue = dues.find(
        (due) => due.status !== 'PAID' && Math.max(due.expectedAmount - due.paidAmount, 0) > 0,
      );
      if (firstPendingDue) {
        setSelectedCycleId(firstPendingDue.cycleId);
        setSelectedDueId(firstPendingDue.id);
      }
    }

    if (resumeProofMode && !resumeBlocked) {
      setShowProofStep(true);
    }

    const methodFromPayment = (requestedPayment?.method ?? '').toUpperCase();
    const preferredMethod = requestedMethod || methodFromPayment;
    if (preferredMethod && ['UPI', 'BANK', 'PHONE'].includes(preferredMethod)) {
      setSelectedMethod(preferredMethod as PaymentMethod);
    }

    setAppliedResumeDefaults(true);
  }, [
    appliedResumeDefaults,
    dashboardQuery.isLoading,
    dues,
    historyRows,
    requestedCycleId,
    requestedDueId,
    requestedMethod,
    requestedPaymentId,
    resumeBlocked,
    resumeProofMode,
  ]);

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

    if (selectedDue && numericAmount > remainingDue) {
      toast.error(`Amount cannot exceed remaining due (${formatCurrency(remainingDue)})`);
      return;
    }

    if (!selectedMethod) {
      toast.error('Select a payment method');
      return;
    }

    setShowProofStep(true);
  };

  const onOpenUpi = () => {
    const numericAmount = parseStrictAmountInput(amount);

    if (!selectedCycleId || numericAmount === null || numericAmount <= 0) {
      toast.error('Select a month and enter a valid amount');
      return;
    }

    if (selectedDue?.status === 'PAID' || remainingDue <= 0) {
      toast.error('This month is already fully paid');
      return;
    }

    if (selectedDue && numericAmount > remainingDue) {
      toast.error(`Amount cannot exceed remaining due (${formatCurrency(remainingDue)})`);
      return;
    }

    if (!paymentConfig?.upiId?.trim()) {
      toast.error('UPI payment is not configured');
      return;
    }

    if (!upiDeepLink) {
      toast.error('Unable to generate UPI link');
      return;
    }

    if (isMobileDevice()) {
      toast.info('Opening your UPI app...');
      launchUpiDeepLink(upiDeepLink);
      return;
    }

    setShowDesktopUpiModal(true);
    toast.info('Open this page on your mobile device to complete the payment.');
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

    if (!utr.trim()) {
      toast.error('Enter UTR/transaction ID before submitting proof');
      return;
    }

    if (selectedDue && numericAmount > remainingDue) {
      toast.error(`Amount cannot exceed remaining due (${formatCurrency(remainingDue)})`);
      return;
    }

    if (!screenshot && !existingScreenshotUrl) {
      toast.error('Upload payment screenshot to submit payment');
      return;
    }

    const fileToUpload = screenshot;
    if (fileToUpload) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(fileToUpload.type)) {
        toast.error('Screenshot must be JPG or PNG');
        return;
      }

      if (fileToUpload.size > 2 * 1024 * 1024) {
        toast.error('Screenshot must be up to 2MB');
        return;
      }
    }

    setSubmitting(true);
    try {
      let screenshotUrl = existingScreenshotUrl || undefined;
      if (fileToUpload) {
        setUploadingScreenshot(true);
        const uploaded = await donationsService.uploadDonationScreenshot(fileToUpload, mosque?.id);
        setUploadingScreenshot(false);
        screenshotUrl = uploaded.url;
      }

      await muqtadisService.initiateMyPayment({
        cycleId: selectedCycleId,
        amount: numericAmount,
        utr: utr.trim() || undefined,
        reference: reference.trim() || selectedMethod,
        screenshotUrl,
      });

      toast.success('Payment submitted for verification');
      setScreenshot(null);
      setUtr('');
      setReference('');
      setExistingScreenshotUrl('');
      setShowProofStep(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDues(user?.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDashboard(mosque?.id) }),
      ]);
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
          {resumeBlocked ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Retry blocked because this payment is already verified.
            </p>
          ) : null}

          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Current Due</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(currentDue)}</p>
          </div>

          {allDuesPaid && !resumeProofMode ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              All dues paid.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Month</Label>
            {exactResumeMatched ? (
              <p className="rounded-xl border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Exact pending payment found{selectedDueId ? ' with linked due context' : ''}. Month selection skipped.
              </p>
            ) : (
              <>
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
                                  setSelectedDueId(due.id);
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
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount due</Label>
            <Input type="text" inputMode="decimal" value={amount} readOnly disabled />
            {amountExceedsRemaining ? (
              <p className="text-xs text-red-600">Amount exceeds remaining due ({formatCurrency(remainingDue)}).</p>
            ) : null}
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

              {selectedMethod === 'UPI' ? (
                <p className="mt-2 text-xs text-muted-foreground">UPI note: {upiVerificationNote}</p>
              ) : null}

              {selectedMethod === 'BANK' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyValue(paymentConfig?.bankAccount)}
                    disabled={!paymentConfig?.bankAccount}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy Account Number
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyValue(paymentConfig?.ifsc)}
                    disabled={!paymentConfig?.ifsc}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy IFSC
                  </Button>
                </div>
              ) : null}

              {selectedMethod === 'PHONE' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyValue(paymentConfig?.phoneNumber)}
                    disabled={!paymentConfig?.phoneNumber}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy Phone Number
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedMethod === 'UPI' ? (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenUpi}
              disabled={
                submitting
                || (allDuesPaid && !resumeProofMode)
                || selectedDue?.status === 'PAID'
                || remainingDue <= 0
                || !amountIsValid
                || amountExceedsRemaining
                || !paymentConfig?.upiId?.trim()
              }
              className="h-11 w-full text-base font-semibold"
            >
              Pay with UPI
            </Button>
          ) : null}

          {!showProofStep ? (
            <Button
              onClick={onHavePaid}
              disabled={
                submitting
                || (allDuesPaid && !resumeProofMode)
                || !availableMethods.length
                || selectedDue?.status === 'PAID'
                || remainingDue <= 0
                || !amountIsValid
                || amountExceedsRemaining
              }
              className="h-11 w-full text-base font-semibold"
            >
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
                {existingScreenshotUrl ? (
                  <a href={existingScreenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    View currently attached screenshot
                  </a>
                ) : null}
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

      <Dialog open={showDesktopUpiModal} onOpenChange={setShowDesktopUpiModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment on Mobile</DialogTitle>
            <DialogDescription>
              Open this page on your mobile device to complete the payment.
            </DialogDescription>
          </DialogHeader>

          {upiDeepLink ? (
            <div className="space-y-4">
              <div className="rounded-md border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">QR Fallback</p>
                <div className="mt-3 flex justify-center">
                  <QRCodeSVG value={upiDeepLink} size={180} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Scan this QR from your UPI app on phone.</p>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  openExternalUrl(upiDeepLink, { requireHttp: false });
                }}
              >
                Try Opening UPI Link
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
