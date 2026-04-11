'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { donationsService } from '@/services/donations.service';
import { type Fund } from '@/services/funds.service';
import { PAYMENT_TYPES } from '@/src/constants';
import { API_BASE_URL } from '@/src/constants';
import { formatPaymentType } from '@/src/utils/format';
import type { PaymentType } from '@/src/constants';
import type { Donation } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { useQueryClient } from '@tanstack/react-query';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';

function resolveReceiptUrl(receipt: string, baseOrigin: string): string | null {
  const raw = receipt.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^https?\/\//i.test(raw)) {
    return raw.replace(/^https?\/\//i, (match) =>
      match.toLowerCase().startsWith('https') ? 'https://' : 'http://',
    );
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  if (raw.startsWith('/')) {
    return `${baseOrigin}${raw}`;
  }

  return `${baseOrigin}/${raw}`;
}

export default function EditDonationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const { canManageDonations } = usePermission();
  const { mosque } = useAuthStore();

  useEffect(() => {
    if (!canManageDonations) {
      router.replace('/dashboard');
    }
  }, [canManageDonations, router]);

  if (!canManageDonations) {
    return null;
  }

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState<string | undefined>();
  const handleViewExistingReceipt = () => {
    if (!existingReceipt) return;
    const baseUrl = (API_BASE_URL ?? '').replace('/api/v1', '');
    const receiptUrl = resolveReceiptUrl(existingReceipt, baseUrl);
    if (!receiptUrl) {
      toast.error('Receipt URL is invalid');
      return;
    }
    router.push(receiptUrl);
  };
  const [formData, setFormData] = useState({
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    amount: '',
    paymentType: '' as PaymentType | '',
    customPaymentMethod: '',
    fundId: '',
    description: '',
    newReceipt: null as File | null,
  });

  const fundsQuery = useFundsListQuery(mosque?.id);
  const fundsLoading = fundsQuery.isLoading;
  const funds: Fund[] = fundsQuery.data ?? [];

  useEffect(() => {
    const masjidFund = funds.find((fund) => fund.type === 'MASJID');
    if (!masjidFund) return;

    setFormData((prev) => ({
      ...prev,
      fundId: prev.fundId || masjidFund.id,
    }));
  }, [funds]);

  // Load existing donation
  useEffect(() => {
    const load = async () => {
      try {
        const donation: Donation = await donationsService.getById(params.id);
        setExistingReceipt(donation.receipt);
        setFormData({
          donorName: donation.donorName ?? '',
          donorEmail: donation.donorEmail ?? '',
          donorPhone: donation.donorPhone ?? '',
          amount: String(donation.amount),
          paymentType: PAYMENT_TYPES.includes(donation.paymentType as PaymentType)
            ? (donation.paymentType as PaymentType)
            : 'OTHER',
          customPaymentMethod: PAYMENT_TYPES.includes(donation.paymentType as PaymentType)
            ? ''
            : donation.paymentType,
          fundId: donation.fundId ?? '',
          description: donation.description ?? '',
          newReceipt: null,
        });
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load donation'));
        router.replace('/dashboard/donations');
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [params.id, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, newReceipt: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!formData.donorName || !formData.amount || !formData.paymentType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.paymentType === 'OTHER' && !formData.customPaymentMethod.trim()) {
      toast.error('Please enter a custom payment method');
      return;
    }

    const amount = parseStrictAmountInput(formData.amount);
    if (amount === null || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedCustomMethod = formData.customPaymentMethod.trim().toLowerCase();

      // Upload new receipt if provided
      let receiptUrl: string | undefined = existingReceipt;
      if (formData.newReceipt) {
        const { url } = await donationsService.uploadReceipt(formData.newReceipt);
        receiptUrl = url;
      }

      await donationsService.update(params.id, {
        donorName: formData.donorName,
        donorEmail: formData.donorEmail || undefined,
        donorPhone: formData.donorPhone || undefined,
        amount,
        paymentType: formData.paymentType as PaymentType,
        customPaymentMethod:
          formData.paymentType === 'OTHER' ? normalizedCustomMethod : undefined,
        description: formData.description || undefined,
        fundId: formData.fundId || undefined,
        ...(receiptUrl ? { receipt: receiptUrl } : {}),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((part) => String(part) === 'pending-count'),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((part) => String(part) === 'donations'),
        }),
        queryClient.invalidateQueries({ queryKey: ['funds'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]);

      toast.success('Donation updated successfully');
      router.push(`/dashboard/donations/${params.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update donation'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching || fundsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/donations/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Edit Donation
          </h1>
          <p className="text-muted-foreground">Update donation details</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Donation Details</CardTitle>
          <CardDescription className="text-muted-foreground">
            Edit the donor information and donation amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="donorName"
                  className="text-sm font-medium text-foreground"
                >
                  Donor Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="donorName"
                  placeholder="Enter donor name"
                  value={formData.donorName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, donorName: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="donorEmail"
                  className="text-sm font-medium text-foreground"
                >
                  Email (Optional)
                </label>
                <Input
                  id="donorEmail"
                  type="email"
                  placeholder="donor@email.com"
                  value={formData.donorEmail}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, donorEmail: e.target.value }))
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="donorPhone"
                  className="text-sm font-medium text-foreground"
                >
                  Phone (Optional)
                </label>
                <Input
                  id="donorPhone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.donorPhone}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, donorPhone: e.target.value }))
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="paymentType"
                  className="text-sm font-medium text-foreground"
                >
                  Payment Type <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.paymentType}
                  onValueChange={(value: PaymentType) =>
                    setFormData((p) => ({
                      ...p,
                      paymentType: value,
                      customPaymentMethod: value === 'OTHER' ? p.customPaymentMethod : '',
                    }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="paymentType">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatPaymentType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.paymentType === 'OTHER' ? (
              <div className="space-y-2">
                <label htmlFor="customPaymentMethod" className="text-sm font-medium text-foreground">
                  Custom Payment Method <span className="text-destructive">*</span>
                </label>
                <Input
                  id="customPaymentMethod"
                  placeholder="Enter payment method"
                  value={formData.customPaymentMethod}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, customPaymentMethod: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="fund" className="text-sm font-medium text-foreground">
                Fund
              </label>
              <Select
                value={formData.fundId}
                onValueChange={(value) =>
                  setFormData((p) => ({ ...p, fundId: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger id="fund">
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-foreground"
              >
                Amount (INR) <span className="text-destructive">*</span>
              </label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    amount: e.target.value,
                  }))
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description / Notes (Optional)
              </label>
              <Textarea
                id="description"
                placeholder="Any additional notes about this donation..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Receipt */}
            <div className="space-y-2">
              <label
                htmlFor="editReceipt"
                className="text-sm font-medium text-foreground"
              >
                Receipt (Optional)
              </label>
              {existingReceipt && !formData.newReceipt && (
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Current receipt on file</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={handleViewExistingReceipt}
                  >
                    View
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  id="editReceipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('editReceipt')?.click()}
                  disabled={isLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {existingReceipt ? 'Replace Receipt' : 'Upload Receipt'}
                </Button>
                {formData.newReceipt && (
                  <span className="text-sm text-muted-foreground">
                    {formData.newReceipt.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
