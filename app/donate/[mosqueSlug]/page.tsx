'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { PublicDonateSkeleton } from '@/components/common/loading-skeletons';
import { Loader2, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { donationsService } from '@/services/donations.service';
import { fundsService } from '@/services/funds.service';
import { getErrorMessage } from '@/src/utils/error';
import { isStrictAmountString } from '@/src/utils/numeric-input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useMinimumLoading } from '@/hooks/useMinimumLoading';

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const [fundId, setFundId] = useState('');
  const [amount, setAmount] = useState('');

  const [session, setSession] = useState<{
    donationId: string;
    intentId: string;
    expiresAt: string;
  } | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  const [showProofForm, setShowProofForm] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK' | 'PHONE'>('UPI');
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
  const [resumeDraft, setResumeDraft] = useState<{
    id: string;
    intentId: string;
    amount: number;
    donationStatus: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    donorName?: string | null;
    donorPhone?: string | null;
    upiTransactionId?: string | null;
    screenshotUrl?: string | null;
    fundId?: string | null;
    expiresAt?: string | null;
  } | null>(null);
  const isMountedRef = useRef(true);
  const restoredHintRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    staleTime: 60_000,
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
    staleTime: 60_000,
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
  const showDonateLoader = useMinimumLoading(isLoadingConfig && !config);
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
    let isCancelled = false;

    const loadResumeDraft = async () => {
      if (!config?.mosqueId || !isPhoneValid) {
        setResumeDraft(null);
        return;
      }

      try {
        const draft = await donationsService.getPublicDonationDraft({
          mosqueId: config.mosqueId,
          donorPhone: trimmedPhoneNumber,
        });
        if (isCancelled) return;
        if (draft?.donationStatus === 'INITIATED') {
          setResumeDraft(draft);
        } else {
          setResumeDraft(null);
        }
      } catch {
        if (isCancelled) return;
        setResumeDraft(null);
      }
    };

    void loadResumeDraft();

    return () => {
      isCancelled = true;
    };
  }, [config?.mosqueId, isPhoneValid, trimmedPhoneNumber]);

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
  const availablePaymentMethods = useMemo(() => {
    const methods: Array<'UPI' | 'BANK' | 'PHONE'> = [];
    if (hasUpiOption) methods.push('UPI');
    if (hasBankOption) methods.push('BANK');
    if (hasPhoneOption) methods.push('PHONE');
    return methods;
  }, [hasBankOption, hasPhoneOption, hasUpiOption]);
  const hasEditableDraft =
    publicDraft?.donationStatus === 'INITIATED'
    || publicDraft?.donationStatus === 'PENDING'
    || publicDraft?.donationStatus === 'REJECTED';

  const donationHintStorageKey = useMemo(() => {
    if (!config?.mosqueId) return null;
    return `mld_public_donation_hint_${config.mosqueId}`;
  }, [config?.mosqueId]);

  useEffect(() => {
    if (!donationHintStorageKey || typeof window === 'undefined') return;
    if (restoredHintRef.current === donationHintStorageKey) return;

    const raw = window.localStorage.getItem(donationHintStorageKey);
    if (!raw) {
      restoredHintRef.current = donationHintStorageKey;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        phoneNumber?: string;
        fundId?: string;
        amount?: string;
        paymentMethod?: 'UPI' | 'BANK' | 'PHONE';
      };

      if (!phoneNumber && parsed.phoneNumber) {
        setPhoneNumber(String(parsed.phoneNumber).replace(/\D/g, '').slice(0, 15));
      }
      if (!fundId && parsed.fundId) {
        setFundId(parsed.fundId);
      }
      if (!amount && parsed.amount) {
        setAmount(parsed.amount);
      }
      if (parsed.paymentMethod && ['UPI', 'BANK', 'PHONE'].includes(parsed.paymentMethod)) {
        setPaymentMethod(parsed.paymentMethod);
      }
    } catch {
      // ignore corrupted local cache
    }

    restoredHintRef.current = donationHintStorageKey;
  }, [amount, donationHintStorageKey, fundId, phoneNumber]);

  useEffect(() => {
    if (!donationHintStorageKey || typeof window === 'undefined') return;

    const hasAnyHint = Boolean(phoneNumber || fundId || amount);
    if (!hasAnyHint) {
      window.localStorage.removeItem(donationHintStorageKey);
      return;
    }

    window.localStorage.setItem(
      donationHintStorageKey,
      JSON.stringify({
        phoneNumber,
        fundId,
        amount,
        paymentMethod,
        updatedAt: Date.now(),
      }),
    );
  }, [amount, donationHintStorageKey, fundId, paymentMethod, phoneNumber]);

  useEffect(() => {
    if (availablePaymentMethods.length === 0) return;
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]);
    }
  }, [availablePaymentMethods, paymentMethod]);

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

  useEffect(() => {
    if (!config?.mosqueId || !isPhoneValid) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const key = `mld_public_payment_method_${config.mosqueId}_${trimmedPhoneNumber}`;
    window.localStorage.setItem(key, paymentMethod);
  }, [config?.mosqueId, isPhoneValid, paymentMethod, trimmedPhoneNumber]);

  const ensureSoftDraftFromCopyIntent = async (): Promise<boolean> => {
    if (!config) {
      toast.error('Donation configuration is unavailable');
      return false;
    }

    if (!fundId) {
      toast.error('Please select a fund first.');
      return false;
    }

    if (!hasValidAmount) {
      toast.error('Please enter a valid amount first.');
      return false;
    }

    if (!trimmedPhoneNumber || !isPhoneValid) {
      toast.error('Please enter a valid phone number first.');
      return false;
    }

    if (isCreatingDraft) {
      return false;
    }

    setIsCreatingDraft(true);
    try {
      if (donationHintStorageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(
          donationHintStorageKey,
          JSON.stringify({
            phoneNumber: trimmedPhoneNumber,
            fundId,
            amount,
            paymentMethod,
            updatedAt: Date.now(),
          }),
        );
      }

      const initiated = await donationsService.initiatePublicDonation({
        mosqueId: config.mosqueId,
        fundId,
        amount: normalizedAmount,
        donorPhone: trimmedPhoneNumber,
      });

      if (!isMountedRef.current) {
        return false;
      }

      setSession({
        donationId: initiated.donationId,
        intentId: initiated.intentId,
        expiresAt: initiated.expiresAt,
      });

      const [fundDraft, latestDraft] = await Promise.all([
        donationsService.getPublicDonationDraft({
          mosqueId: config.mosqueId,
          donorPhone: trimmedPhoneNumber,
          fundId,
        }),
        donationsService.getPublicDonationDraft({
          mosqueId: config.mosqueId,
          donorPhone: trimmedPhoneNumber,
        }),
      ]);

      setPublicDraft(fundDraft);
      setResumeDraft(latestDraft?.donationStatus === 'INITIATED' ? latestDraft : null);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save donation draft'));
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsCreatingDraft(false);
      }
    }
  };

  const handleCopyWithDraftIntent = async (value: string, label: string) => {
    const draftSaved = await ensureSoftDraftFromCopyIntent();
    if (!draftSaved) {
      return;
    }
    await copyText(value, label);
  };

  const handleOpenProofFlow = () => {
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

    if (publicDraft && hasEditableDraft) {
      setSession({
        donationId: publicDraft.id,
        intentId: publicDraft.intentId,
        expiresAt: publicDraft.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      setDonorName(publicDraft.donorName ?? donorName);
      setUpiTransactionId(publicDraft.upiTransactionId ?? '');
      setShowProofForm(true);
      toast.success('Continuing your existing donation draft.');
      return;
    }

    setSession(null);
    setShowProofForm(true);
    toast.success('Upload your payment proof to submit donation.');
  };

  const handleContinueResumeDraft = () => {
    if (!resumeDraft || !config?.mosqueId) {
      return;
    }

    if (resumeDraft.fundId) {
      setFundId(resumeDraft.fundId);
    }
    if (resumeDraft.amount) {
      setAmount(String(resumeDraft.amount));
    }
    if (resumeDraft.donorPhone) {
      setPhoneNumber(resumeDraft.donorPhone);
    }
    if (resumeDraft.donorName) {
      setDonorName(resumeDraft.donorName);
    }
    if (resumeDraft.upiTransactionId) {
      setUpiTransactionId(resumeDraft.upiTransactionId);
    }

    if (typeof window !== 'undefined') {
      const key = `mld_public_payment_method_${config.mosqueId}_${resumeDraft.donorPhone ?? trimmedPhoneNumber}`;
      const savedMethod = window.localStorage.getItem(key);
      if (savedMethod === 'UPI' || savedMethod === 'BANK' || savedMethod === 'PHONE') {
        setPaymentMethod(savedMethod);
      }
    }

    setSession({
      donationId: resumeDraft.id,
      intentId: resumeDraft.intentId,
      expiresAt: resumeDraft.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    setShowProofForm(true);
    toast.success('Draft resumed. Continue with proof upload.');
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trimmedPhoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Phone number must be 10 to 15 digits.');
      return;
    }

    const trimmedUtr = upiTransactionId.trim();
    if (!trimmedUtr && !screenshot) {
      toast.error('Provide UTR or payment screenshot');
      return;
    }

    let screenshotUrl: string | undefined;
    if (screenshot) {
      if (!ALLOWED_SCREENSHOT_TYPES.includes(screenshot.type)) {
        toast.error('Only JPG, PNG, or WEBP images are allowed.');
        return;
      }
      if (screenshot.size > MAX_SCREENSHOT_BYTES) {
        toast.error('Screenshot must be 10MB or smaller.');
        return;
      }
    }

    setIsSubmittingProof(true);
    try {
      if (screenshot && config) {
        setIsUploading(true);
        setIsCompressing(true);
        const upload = await donationsService.uploadDonationScreenshot(
          screenshot,
          config.mosqueId,
          (stage) => {
            setIsCompressing(stage === 'compressing');
            setIsUploading(stage === 'uploading');
          },
        );
        if (!isMountedRef.current) {
          return;
        }
        screenshotUrl = upload.url;
        setIsCompressing(false);
        setIsUploading(false);
      }

      const donorNameValue = donorName.trim() || undefined;
      const upiTransactionIdValue = trimmedUtr || undefined;
      const verificationNoteValue = verificationNote.trim() || undefined;

      const donation = session?.donationId
        ? await donationsService.updatePublicDonationProof(session.donationId, {
            donorName: donorNameValue,
            phoneNumber: trimmedPhoneNumber,
            upiTransactionId: upiTransactionIdValue,
            verificationNote: verificationNoteValue,
            screenshotUrl,
          })
        : await donationsService.submitPublicDonationProof({
            mosqueId: config?.mosqueId,
            fundId,
            amount: normalizedAmount,
            donorPhone: trimmedPhoneNumber,
            donorName: donorNameValue,
            upiTransactionId: upiTransactionIdValue,
            verificationNote: verificationNoteValue,
            screenshotUrl,
          });

      if (donation?.id && donation?.intentId) {
        if (!isMountedRef.current) {
          return;
        }
        setSession({
          donationId: donation.id,
          intentId: donation.intentId,
          expiresAt: donation.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      }

      try {
        if (config?.mosqueId && fundId && isPhoneValid) {
          const refreshedDraft = await donationsService.getPublicDonationDraft({
            mosqueId: config.mosqueId,
            fundId,
            donorPhone: trimmedPhoneNumber,
          });
          if (!isMountedRef.current) {
            return;
          }
          setPublicDraft(refreshedDraft);
        }
      } catch {
        // Non-blocking refresh
      }

      toast.success('Proof uploaded successfully');
      if (!isMountedRef.current) {
        return;
      }
      setVerificationNote('');
      setShowProofForm(false);
    } catch (error) {
      if (isMountedRef.current) {
        setIsCompressing(false);
        setIsUploading(false);
      }
      toast.error(getErrorMessage(error, 'Failed to submit proof'));
    } finally {
      if (isMountedRef.current) {
        setIsSubmittingProof(false);
      }
    }
  };

  if (showDonateLoader) {
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
            Pay using any method below, then upload proof.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Donation Details</CardTitle>
            <CardDescription>This page is tied to a permanent mosque QR link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeDraft ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900">Continue Previous Donation Draft</p>
                <p className="mt-1 text-amber-800">
                  Draft amount: INR {Number(resumeDraft.amount ?? 0).toFixed(2)}
                </p>
                <p className="text-amber-800">
                  Expires in {Math.max(0, Math.ceil((new Date(resumeDraft.expiresAt || Date.now()).getTime() - Date.now()) / 60000))} minute(s)
                </p>
                <Button type="button" size="sm" className="mt-2" onClick={handleContinueResumeDraft}>
                  Continue Draft
                </Button>
              </div>
            ) : null}

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

            {hasAnyPaymentOption ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                <div className="flex flex-wrap gap-2">
                  {availablePaymentMethods.map((method) => (
                    <Button
                      key={method}
                      type="button"
                      size="sm"
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </Button>
                  ))}
                </div>

                {paymentMethod === 'UPI' && hasUpiOption ? (
                  <div className="space-y-2 rounded-lg border border-emerald-200 bg-white p-4 text-sm">
                    <p className="font-semibold text-foreground">UPI</p>
                    <p className="text-muted-foreground">
                      UPI ID: <span className="font-medium text-foreground">{config.upiId}</span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyWithDraftIntent(config.upiId, 'UPI ID')}
                    >
                      Copy UPI ID
                    </Button>
                  </div>
                ) : null}

                {paymentMethod === 'BANK' && hasBankOption ? (
                  <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-4 text-sm">
                    <p className="font-semibold text-foreground">Bank</p>
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
                        Bank Name: <span className="font-medium text-foreground">{config.bankName}</span>
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {config.bankAccount ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCopyWithDraftIntent(config.bankAccount ?? '', 'Account number')}
                        >
                          Copy Account Number
                        </Button>
                      ) : null}
                      {config.ifsc ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCopyWithDraftIntent(config.ifsc ?? '', 'IFSC')}
                        >
                          Copy IFSC
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {paymentMethod === 'PHONE' && hasPhoneOption ? (
                  <div className="space-y-2 rounded-lg border border-violet-200 bg-white p-4 text-sm">
                    <p className="font-semibold text-foreground">Phone</p>
                    <p className="text-muted-foreground">
                      Phone Number: <span className="font-medium text-foreground">{config.phoneNumber}</span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyWithDraftIntent(config.phoneNumber ?? '', 'Phone number')}
                    >
                      Copy Phone Number
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Step 1: Pay using your selected method. Step 2: Upload payment proof.
            </div>

            {config.paymentInstructions ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                {config.paymentInstructions}
              </div>
            ) : null}

            <Button
              onClick={handleOpenProofFlow}
              disabled={
                isDonationFormDisabled ||
                !hasValidAmount ||
                !fundId ||
                !hasAnyPaymentOption
              }
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Payment Proof
            </Button>

            {hasEditableDraft ? (
              <p className="text-xs text-amber-700">
                Existing {publicDraft?.donationStatus?.toLowerCase()} draft found for this phone and fund. You can continue it here.
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

        <Sheet
          open={showProofForm}
          onOpenChange={(open) => {
            setShowProofForm(open);
          }}
        >
          <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Upload Payment Proof</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Phone number is required. Add UTR, screenshot, or note.
              </p>
            </SheetHeader>

            <div className="p-4">
              {minutesLeft !== null ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  Session expires in {minutesLeft} minute{minutesLeft === 1 ? '' : 's'}
                </p>
              ) : null}

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
                  <Label htmlFor="verification-note">Note (Optional)</Label>
                  <Input
                    id="verification-note"
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="Add any payment note"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshot">Screenshot (Optional, JPG/PNG/WEBP, up to 10MB)</Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                  {publicDraft?.screenshotUrl ? (
                    <Link href={publicDraft.screenshotUrl} className="text-xs text-primary underline">
                      View currently attached screenshot
                    </Link>
                  ) : null}
                </div>

                <Button type="submit" disabled={isSubmittingProof} className="w-full">
                  {isSubmittingProof ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isCompressing ? 'Compressing screenshot...' : isUploading ? 'Uploading screenshot...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Proof
                    </>
                  )}
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

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
      </div>
    </div>
  );
}
