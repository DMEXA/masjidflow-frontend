'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { donationsService } from '@/services/donations.service';
import { fundsService, type Fund } from '@/services/funds.service';
import { PAYMENT_TYPES } from '@/src/constants';
import { formatPaymentType } from '@/src/utils/format';
import type { PaymentType } from '@/src/constants';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { useQueryClient } from '@tanstack/react-query';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';

export default function AddDonationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    amount: '',
    paymentType: '' as PaymentType | '',
    customPaymentMethod: '',
    fundId: '',
    description: '',
    receipt: null as File | null,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData((prev) => ({ ...prev, receipt: file }));
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

      // 1. Upload receipt file first if one is selected
      let receiptUrl: string | undefined;
      if (formData.receipt) {
        const { url } = await donationsService.uploadReceipt(formData.receipt);
        receiptUrl = url;
      }

      // 2. Create the donation record
      console.log('FRONTEND SEND:', amount);
      const createdDonation = await donationsService.create({
        donorName: formData.donorName,
        donorEmail: formData.donorEmail || undefined,
        donorPhone: formData.donorPhone || undefined,
        amount,
        paymentType: formData.paymentType as PaymentType,
        customPaymentMethod:
          formData.paymentType === 'OTHER' ? normalizedCustomMethod : undefined,
        description: formData.description || undefined,
        fundId: formData.fundId || undefined,
        receipt: receiptUrl,
      });

      queryClient.setQueriesData(
        {
          predicate: (query) => query.queryKey.some((part) => String(part) === 'donations'),
        },
        (old: any) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: [createdDonation, ...old.data],
          };
        },
      );

      if (createdDonation?.donationStatus === 'PENDING') {
        queryClient.setQueryData(['pending-count', mosque?.id], (old: any) => {
          const current = Number(old?.count ?? 0);
          return { count: current + 1 };
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((part) => String(part) === 'donations'),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((part) => String(part) === 'pending-count'),
        }),
      ]);

      await invalidateMoneyQueries(queryClient);

      toast.success('Donation added successfully');
      router.push('/dashboard/donations');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add donation'));
    } finally {
      setIsLoading(false);
    }
  };

  if (fundsLoading) {
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
          <Link href="/dashboard/donations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Donation</h1>
          <p className="text-muted-foreground">Record a new donation</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Donation Details</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the donor information and donation amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="donorName" className="text-sm font-medium text-foreground">
                  Donor Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="donorName"
                  placeholder="Enter donor name"
                  value={formData.donorName}
                  onChange={(e) => setFormData((p) => ({ ...p, donorName: e.target.value }))}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="donorEmail" className="text-sm font-medium text-foreground">
                  Email (Optional)
                </label>
                <Input
                  id="donorEmail"
                  type="email"
                  placeholder="donor@email.com"
                  value={formData.donorEmail}
                  onChange={(e) => setFormData((p) => ({ ...p, donorEmail: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="donorPhone" className="text-sm font-medium text-foreground">
                  Phone (Optional)
                </label>
                <Input
                  id="donorPhone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.donorPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, donorPhone: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="paymentType" className="text-sm font-medium text-foreground">
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
                onValueChange={(value) => setFormData((p) => ({ ...p, fundId: value }))}
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
              <label htmlFor="amount" className="text-sm font-medium text-foreground">
                Amount (INR) <span className="text-destructive">*</span>
              </label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                pattern="^\\d+(?:\\.\\d{1,2})?$"
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
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description / Notes (Optional)
              </label>
              <Textarea
                id="description"
                placeholder="Any additional notes about this donation..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="donationReceipt" className="text-sm font-medium text-foreground">
                Receipt (Optional)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  id="donationReceipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('donationReceipt')?.click()}
                  disabled={isLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Receipt
                </Button>
                {formData.receipt && (
                  <span className="text-sm text-muted-foreground">{formData.receipt.name}</span>
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
                  'Add Donation'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
