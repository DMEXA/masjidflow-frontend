'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { PublicDonateSkeleton } from '@/components/common/loading-skeletons';
import { Loader2, CheckCircle2, Upload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { donationsService } from '@/services/donations.service';
import { fundsService } from '@/services/funds.service';
import { getErrorMessage } from '@/src/utils/error';
import { isStrictAmountString } from '@/src/utils/numeric-input';
import { openExternalUrl } from '@/src/utils/open-external-url';
import { launchUpiDeepLink } from '@/src/utils/upi-launch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const DEVICE_ID_KEY = 'mld_public_device_id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated =
    window.crypto?.randomUUID?.() ?? `mld-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileRegex = /android|iphone|ipad|ipod|opera mini|iemobile|mobile/;
  return mobileRegex.test(userAgent);
}

function buildPublicUpiNote(mosqueName: string): string {
  const normalized = mosqueName.trim().replace(/\s+/g, ' ');
  const note = `Donation ${normalized || 'Masjid'}`;
  return note.length > 80 ? `${note.slice(0, 80).trim()}...` : note;
}

function buildPublicUpiDeepLink(input: { upiId: string; upiName: string; amount: string; note: string }): string {
  const transactionRef = `MLD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const params = new URLSearchParams({
    pa: input.upiId.trim(),
    pn: input.upiName.trim(),
    am: input.amount.trim(),
    cu: 'INR',
    tn: input.note.trim(),
    tr: transactionRef,
    mc: '0000',
    orgid: '000000',
  });
  return `upi://pay?${params.toString()}`;
}

async function copyText(value: string, label: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
}

export default function DonateBySlugPage() {
  const params = useParams<{ mosqueSlug: string }>();
  const mosqueSlug = params.mosqueSlug;
  const queryClient = useQueryClient();

  const [isInitiating, setIsInitiating] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [fundId, setFundId] = useState('');
  const [amount, setAmount] = useState('');

  const [session, setSession] = useState<{
    donationId: string;
    intentId: string;
    upiDeepLink: string;
    expiresAt: string;
  } | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  const [showPaymentQuestion, setShowPaymentQuestion] = useState(false);
  const [showProofForm, setShowProofForm] = useState(false);
  const [showDesktopUpiModal, setShowDesktopUpiModal] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [publicDraft, setPublicDraft] = useState<{
    id: string;
    intentId: string;
    amount: number;
    donationStatus: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    donorName?: string | null;
    donorPhone?: string | null;
    upiTransactionId?: string | null;
    screenshotUrl?: string | null;
    expiresAt?: string | null;
  } | null>(null);

  const trimmedPhoneNumber = phoneNumber.trim();
  const isPhoneValid = /^\d{10,15}$/.test(trimmedPhoneNumber);

  const slugQuery = useQuery({
    queryKey: queryKeys.publicDonateSlug(mosqueSlug),
    enabled: Boolean(mosqueSlug),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous ?? queryClient.getQueryData(queryKeys.publicDonateSlug(mosqueSlug)),
    queryFn: () => donationsService.getPublicConfigBySlug(mosqueSlug),
  });

  const mosqueId = slugQuery.data?.mosqueId;
  const publicConfigQuery = useQuery({
    queryKey: queryKeys.publicDonateConfig(mosqueId),
    enabled: Boolean(mosqueId),
    staleTime: 45_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous ?? queryClient.getQueryData(queryKeys.publicDonateConfig(mosqueId)),
    queryFn: () => donationsService.getPublicConfig(mosqueId),
  });

  const publicFundsQuery = useQuery({
    queryKey: queryKeys.publicDonateFunds(mosqueId),
    enabled: Boolean(mosqueId),
    staleTime: 45_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous ?? queryClient.getQueryData(queryKeys.publicDonateFunds(mosqueId)),
    queryFn: () => fundsService.getPublicByMosqueId(mosqueId!),
  });

  const config = useMemo(() => {
    if (!publicConfigQuery.data) return null;
    return {
      ...publicConfigQuery.data,
      funds: (publicFundsQuery.data ?? []).map((fund) => ({ id: fund.id, name: fund.name })),
    };
  }, [publicConfigQuery.data, publicFundsQuery.data]);

  const isLoadingConfig = slugQuery.isLoading || publicConfigQuery.isLoading || publicFundsQuery.isLoading;
  const loadError = useMemo(() => {
    const error = slugQuery.error ?? publicConfigQuery.error ?? publicFundsQuery.error;
    return error ? getErrorMessage(error, 'Failed to load donation page') : null;
  }, [publicConfigQuery.error, publicFundsQuery.error, slugQuery.error]);

  useEffect(() => {
    let isCancelled = false;

    const loadDraft = async () => {
      if (!config?.mosqueId || !fundId || !isPhoneValid) {
        setPublicDraft(null);
        return;
      }

      try {
        const draft = await donationsService.getPublicDonationDraft({
          mosqueId: config.mosqueId,
          fundId,
          donorPhone: trimmedPhoneNumber,
        });
        if (isCancelled) return;
        setPublicDraft(draft);
      } catch {
        if (isCancelled) return;
        setPublicDraft(null);
      }
    };

    void loadDraft();

    return () => {
      isCancelled = true;
    };
  }, [config?.mosqueId, fundId, isPhoneValid, trimmedPhoneNumber]);

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  useEffect(() => {
    if (!fundId && config?.funds?.length) {
      setFundId(config.funds[0].id);
    }
  }, [config?.funds, fundId]);

  const normalizedAmount = useMemo(() => amount.trim(), [amount]);
  const hasValidAmount = useMemo(() => {
    if (!isStrictAmountString(normalizedAmount)) return false;
    return normalizedAmount !== '0' && normalizedAmount !== '0.0' && normalizedAmount !== '0.00';
  }, [normalizedAmount]);

  const hasUpiOption = Boolean(config?.upiId?.trim());
  const hasBankOption = Boolean(
    config?.bankAccount?.trim() ||
      config?.bankAccountName?.trim() ||
      config?.ifsc?.trim() ||
      config?.bankName?.trim(),
  );
  const hasPhoneOption = Boolean(config?.phoneNumber?.trim());
  const hasAnyPaymentOption = hasUpiOption || hasBankOption || hasPhoneOption;
  const hasEditableDraft =
    publicDraft?.donationStatus === 'INITIATED'
    || publicDraft?.donationStatus === 'PENDING'
    || publicDraft?.donationStatus === 'REJECTED';

  useEffect(() => {
    if (!session?.expiresAt) {
      setMinutesLeft(null);
      return;
    }

    const tick = () => {
      const expiresAtMs = new Date(session.expiresAt).getTime();
      const diffMs = expiresAtMs - Date.now();
      const nextMinutes = Math.max(0, Math.ceil(diffMs / 60000));
      setMinutesLeft(nextMinutes);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session?.expiresAt]);

  const handlePayWithUpi = async () => {
    if (!config) {
      toast.error('Donation configuration is unavailable');
      return;
    }

    if (!fundId) {
      toast.error('Please select a fund');
      return;
    }

    if (!hasValidAmount) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!trimmedPhoneNumber) {
      toast.error('Phone number is required to continue.');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Phone number must be 10 to 15 digits.');
      return;
    }

    if (config && publicDraft && hasEditableDraft) {
      const draftAmount = Number(publicDraft.amount);
      const safeAmount = Number.isFinite(draftAmount) && draftAmount > 0
        ? draftAmount
        : Number(normalizedAmount || '0');
      const upiDeepLink = config.upiId
        ? buildPublicUpiDeepLink({
            upiId: config.upiId,
            upiName: config.upiName,
            amount: safeAmount.toFixed(2),
            note: buildPublicUpiNote(config.mosqueName),
          })
        : '';

      setSession({
        donationId: publicDraft.id,
        intentId: publicDraft.intentId,
        upiDeepLink,
        expiresAt: publicDraft.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      setDonorName(publicDraft.donorName ?? donorName);
      setUpiTransactionId(publicDraft.upiTransactionId ?? '');
      setShowPaymentQuestion(false);
      setShowProofForm(true);
      toast.success('Continuing your existing donation draft.');
      return;
    }

    setIsInitiating(true);
    try {
      const initiated = await donationsService.initiatePublicDonation({
        mosqueId: config.mosqueId,
        fundId,
        amount: normalizedAmount,
        deviceId: getDeviceId(),
        donorPhone: trimmedPhoneNumber,
      });

      setSession(initiated);
      setShowPaymentQuestion(true);

      if (initiated.upiDeepLink && isMobileDevice()) {
        toast.info('Opening your UPI app...');
        launchUpiDeepLink(initiated.upiDeepLink);
      } else if (initiated.upiDeepLink) {
        setShowDesktopUpiModal(true);
        toast.info('Open this page on your mobile device to complete the payment.');
      } else {
        toast.info('Proceed with bank transfer and upload your payment proof.');
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to start payment');
      toast.error(message);
    } finally {
      setIsInitiating(false);
    }
  };

  const handlePaidClick = () => {
    setShowProofForm(true);
    toast.success('Payment recorded. Please upload proof.');
  };

  const handleCancelledClick = () => {
    setShowProofForm(false);
    toast.info('No problem. You can retry payment anytime using this page.');
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error('Payment session not found');
      return;
    }

    if (!trimmedPhoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Phone number must be 10 digits.');
      return;
    }

    const trimmedUtr = upiTransactionId.trim();
    if (!trimmedUtr && !screenshot) {
      toast.error('Provide UTR or payment screenshot');
      return;
    }

    let screenshotUrl: string | undefined;
    if (screenshot) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(screenshot.type)) {
        toast.error('Unsupported file type');
        return;
      }
    }

    setIsSubmittingProof(true);
    try {
      if (screenshot && config) {
        setIsUploading(true);
        const upload = await donationsService.uploadDonationScreenshot(
          screenshot,
          config.mosqueId,
        );
        screenshotUrl = upload.url;
        setIsUploading(false);
      }

      await donationsService.updatePublicDonationProof(session.donationId, {
        donorName: donorName.trim() || undefined,
        phoneNumber: trimmedPhoneNumber,
        upiTransactionId: trimmedUtr || undefined,
        screenshotUrl,
      });

      toast.success('Proof uploaded successfully');
      setShowProofForm(false);
    } catch (error) {
      setIsUploading(false);
      toast.error(getErrorMessage(error, 'Failed to submit proof'));
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (isLoadingConfig) {
    return <PublicDonateSkeleton />;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Unable to Load Donate Page</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Donate Link Not Found</CardTitle>
            <CardDescription>
              This QR link is invalid or the mosque is not active.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasFunds = config.funds.length > 0;
  const isDonationFormDisabled = !hasFunds;

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50 via-white to-amber-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Donate to {config.mosqueName}</h1>
          <p className="mt-2 text-muted-foreground">
            Select fund and amount, then choose your preferred payment method.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Donation Details</CardTitle>
            <CardDescription>This page is tied to a permanent mosque QR link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fundId">Fund</Label>
              <Select value={fundId} onValueChange={setFundId} disabled={isDonationFormDisabled}>
                <SelectTrigger id="fundId">
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {config.funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (INR)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                disabled={isDonationFormDisabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donate-phone-number">Phone Number</Label>
              <Input
                id="donate-phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="Enter 10 digit phone number"
                inputMode="numeric"
                minLength={10}
                maxLength={15}
                required
                disabled={isDonationFormDisabled}
              />
              {/* <p className="text-xs text-muted-foreground">Required. Use 10 to 15 digits.</p> */}
            </div>

            {!hasAnyPaymentOption ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Payment is currently unavailable. Please contact mosque admin.
              </div>
            ) : null}

            {hasUpiOption ? (
              <div className="space-y-2 rounded-lg border border-dashed border-emerald-300 bg-white p-4 text-sm">
                <p className="font-semibold text-foreground">Pay via UPI</p>
                <p className="text-xs text-emerald-700">Recommended: Use UPI for faster verification</p>
                <p className="text-muted-foreground">
                  UPI ID: <span className="font-medium text-foreground">{config.upiId}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText(config.upiId, 'UPI ID')}
                  >
                    Copy UPI ID
                  </Button>
                </div>
              </div>
            ) : null}

            {hasBankOption ? (
              <div className="space-y-2 rounded-lg border border-dashed border-blue-300 bg-white p-4 text-sm">
                <p className="font-semibold text-foreground">Pay via Bank Transfer</p>
                {config.bankAccountName ? (
                  <p className="text-muted-foreground">
                    Account Holder: <span className="font-medium text-foreground">{config.bankAccountName}</span>
                  </p>
                ) : null}
                {config.bankAccount ? (
                  <p className="text-muted-foreground">
                    Account Number: <span className="font-medium text-foreground">{config.bankAccount}</span>
                  </p>
                ) : null}
                {config.ifsc ? (
                  <p className="text-muted-foreground">
                    IFSC: <span className="font-medium text-foreground">{config.ifsc}</span>
                  </p>
                ) : null}
                {config.bankName ? (
                  <p className="text-muted-foreground">
                    Bank: <span className="font-medium text-foreground">{config.bankName}</span>
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {config.bankAccount ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyText(config.bankAccount ?? '', 'Account number')}
                    >
                      Copy Account Number
                    </Button>
                  ) : null}
                  {config.ifsc ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyText(config.ifsc ?? '', 'IFSC')}
                    >
                      Copy IFSC
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {hasPhoneOption ? (
              <div className="space-y-2 rounded-lg border border-dashed border-violet-300 bg-white p-4 text-sm">
                <p className="font-semibold text-foreground">Pay via Phone Number</p>
                <p className="text-muted-foreground">
                  Phone: <span className="font-medium text-foreground">{config.phoneNumber}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyText(config.phoneNumber ?? '', 'Phone number')}
                  >
                    Copy Phone Number
                  </Button>
                </div>
              </div>
            ) : null}

            {config.paymentInstructions ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                {config.paymentInstructions}
              </div>
            ) : null}

            <Button
              onClick={handlePayWithUpi}
              disabled={
                isDonationFormDisabled ||
                isInitiating ||
                !hasValidAmount ||
                !fundId ||
                !hasAnyPaymentOption
              }
            >
              {isInitiating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {hasEditableDraft ? 'Continue Donation' : 'Start Payment'}
            </Button>

            {hasEditableDraft ? (
              <p className="text-xs text-amber-700">
                Existing {publicDraft?.donationStatus?.toLowerCase()} draft found for this phone and fund. Continuing will update the same donation.
              </p>
            ) : null}

            {!hasFunds ? (
              <ListEmptyState
                title="No donation funds configured"
                description="Please contact the mosque admin to enable donations."
                actionLabel="Back to Donations"
                actionHref="/donate"
                className="min-h-36 border-amber-200 bg-amber-50/60"
              />
            ) : null}
          </CardContent>
        </Card>

        {showPaymentQuestion && session ? (
          <Card>
            <CardHeader>
              <CardTitle>Did you complete the payment?</CardTitle>
              <CardDescription>
                Donation reference: {session.intentId}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {minutesLeft !== null ? (
                <p className="w-full text-sm text-muted-foreground">
                  Session expires in {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}
                </p>
              ) : null}
              <Button onClick={handlePaidClick}>I HAVE PAID</Button>
              <Button variant="outline" onClick={handleCancelledClick}>I CANCELLED</Button>
              <Button variant="secondary" asChild>
                <Link href={`/donate/status/${session.donationId}`}>Open Status Page</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {showProofForm && session ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload Payment Proof</CardTitle>
              <CardDescription>
                Phone number is required. Screenshot is optional for apps that block screenshots.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProofSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="donorName">Donor Name (Optional)</Label>
                    <Input
                      id="donorName"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionId">UTR (Optional)</Label>
                  <Input
                    id="transactionId"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    GPay / PhonePe: check transaction details for Transaction ID (UTR)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshot">Screenshot (Optional, JPG/PNG)</Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                  {publicDraft?.screenshotUrl ? (
                    <Link href={publicDraft.screenshotUrl} className="text-xs text-primary underline">
                      View currently attached screenshot
                    </Link>
                  ) : null}
                </div>

                <Button type="submit" disabled={isSubmittingProof}>
                  {isSubmittingProof ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? 'Processing image...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Proof
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {session ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Donation session created successfully.</p>
                  <p>Reference: {session.intentId}</p>
                  <Link className="text-primary underline" href={`/donate/status/${session.donationId}`}>
                    Track donation status
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Dialog open={showDesktopUpiModal} onOpenChange={setShowDesktopUpiModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment on Mobile</DialogTitle>
              <DialogDescription>
                Open this page on your mobile device to complete the payment.
              </DialogDescription>
            </DialogHeader>

            {session ? (
              <div className="space-y-4">
                <div className="rounded-md border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">QR Fallback</p>
                  <div className="mt-3 flex justify-center">
                    <QRCodeSVG value={session.upiDeepLink} size={180} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Scan this QR from your UPI app on phone.
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    openExternalUrl(session.upiDeepLink, { requireHttp: false });
                  }}
                >
                  Try Opening UPI Link
                </Button>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
