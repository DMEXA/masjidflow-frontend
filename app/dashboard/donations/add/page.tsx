'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { type Fund } from '@/services/funds.service';
import { PAYMENT_TYPES } from '@/src/constants';
import { formatPaymentType } from '@/src/utils/format';
import type { PaymentType } from '@/src/constants';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';
import { queryKeys } from '@/lib/query-keys';
import {
  debugInvalidateByFilters,
  endFlowGroup,
  logOptimisticUpdate,
  logRollback,
  startFlowGroup,
} from '@/lib/query-debug';

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

  const [uploadStage, setUploadStage] = useState<'compressing' | 'uploading' | null>(null);
  const [formData, setFormData] = useState({
    donorName: '',
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
  const funds: Fund[] = useMemo(() => fundsQuery.data ?? [], [fundsQuery.data]);

  useEffect(() => {
    const masjidFund = funds.find((fund) => fund.type === 'MASJID');
    if (!masjidFund) return;

    setFormData((prev) => ({
      ...prev,
      fundId: prev.fundId || masjidFund.id,
    }));
  }, [funds]);

  const createDonationMutation = useMutation({
    mutationKey: ['donation'],
    mutationFn: async (payload: {
      donorName: string;
      donorPhone?: string;
      amount: number;
      paymentType: PaymentType;
      customPaymentMethod?: string;
      description?: string;
      fundId?: string;
      receipt?: File | null;
    }) => {
      startFlowGroup('DONATION FLOW');
      let receiptUrl: string | undefined;
      if (payload.receipt) {
        const { url } = await donationsService.uploadReceipt(payload.receipt, setUploadStage);
        receiptUrl = url;
      }

      return donationsService.create({
        donorName: payload.donorName,
        donorPhone: payload.donorPhone,
        amount: payload.amount,
        paymentType: payload.paymentType,
        customPaymentMethod: payload.customPaymentMethod,
        description: payload.description,
        fundId: payload.fundId,
        receipt: receiptUrl,
      });
    },
    onMutate: async (newData) => {
      logOptimisticUpdate('donation', newData);
      const donationsRootKey = queryKeys.donationsRoot(mosque?.id);
      const pendingCountKey = queryKeys.donationsPendingCount(mosque?.id);
      const dashboardOverviewKey = queryKeys.dashboardOverview(mosque?.id);
      const optimisticId = `temp-${Date.now()}`;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: donationsRootKey, exact: false }),
        queryClient.cancelQueries({ queryKey: pendingCountKey, exact: false }),
        queryClient.cancelQueries({ queryKey: dashboardOverviewKey, exact: false }),
      ]);

      const previousDonationQueries = queryClient.getQueriesData({
        queryKey: donationsRootKey,
        exact: false,
      });
      const previousPendingCount = queryClient.getQueryData(pendingCountKey);
      const previousDashboardQueries = queryClient.getQueriesData({
        queryKey: dashboardOverviewKey,
        exact: false,
      });

      queryClient.setQueriesData({ queryKey: donationsRootKey, exact: false }, (old: any) => {
        if (!old || !Array.isArray(old.data)) return old;
        if (old.data.some((item: any) => item?.id === optimisticId)) return old;
        return {
          ...old,
          data: [
            {
              id: optimisticId,
              donorName: newData.donorName,
              donorPhone: newData.donorPhone || null,
              amount: newData.amount,
              paymentType: newData.paymentType,
              donationStatus: 'PENDING',
              createdAt: new Date().toISOString(),
              isOptimistic: true,
            },
            ...old.data,
          ],
        };
      });

      queryClient.setQueryData(pendingCountKey, (old: any) => {
        const current = Number(old?.count ?? 0);
        return { count: current + 1 };
      });

      queryClient.setQueriesData({ queryKey: dashboardOverviewKey, exact: false }, (old: any) => {
        if (!old?.stats) return old;
        return {
          ...old,
          stats: {
            ...old.stats,
            totalDonations: Number(old.stats.totalDonations ?? 0) + newData.amount,
            net: Number(old.stats.net ?? 0) + newData.amount,
          },
        };
      });

      return { previousDonationQueries, previousPendingCount, previousDashboardQueries, optimisticId };
    },
    onError: (error, _newData, context) => {
      logRollback(context);
      context?.previousDonationQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      queryClient.setQueryData(queryKeys.donationsPendingCount(mosque?.id), context?.previousPendingCount);
      context?.previousDashboardQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(getErrorMessage(error, 'Failed to add donation'));
      endFlowGroup();
    },
    onSuccess: (createdDonation, _newData, context) => {
      const optimisticId = context?.optimisticId;
      if (!optimisticId) return;

      queryClient.setQueriesData({ queryKey: queryKeys.donationsRoot(mosque?.id), exact: false }, (old: any) => {
        if (!old || !Array.isArray(old.data)) return old;
        const withoutTemp = old.data.filter((item: any) => item?.id !== optimisticId);
        const hasReal = withoutTemp.some((item: any) => item?.id === createdDonation.id);
        return {
          ...old,
          data: hasReal ? withoutTemp : [createdDonation, ...withoutTemp],
        };
      });
    },
    onSettled: async () => {
      await debugInvalidateByFilters(queryClient, {
        predicate: ({ queryKey }) => {
          const root = String(queryKey?.[0] ?? '');
          return root === queryKeys.fundsRoot[0] || root === queryKeys.reports[0];
        },
      });
      setUploadStage(null);
      endFlowGroup();
    },
  });

  const isLoading = createDonationMutation.isPending;

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

    try {
      const normalizedCustomMethod = formData.customPaymentMethod.trim().toLowerCase();

      await createDonationMutation.mutateAsync({
        donorName: formData.donorName,
        donorPhone: formData.donorPhone || undefined,
        amount,
        paymentType: formData.paymentType as PaymentType,
        customPaymentMethod:
          formData.paymentType === 'OTHER' ? normalizedCustomMethod : undefined,
        description: formData.description || undefined,
        fundId: formData.fundId || undefined,
        receipt: formData.receipt,
      });

      toast.success('Donation added successfully');
      router.push('/dashboard/donations');
    } finally {
      if (!createDonationMutation.isPending) {
        setUploadStage(null);
      }
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
                    {uploadStage === 'compressing'
                      ? 'Compressing receipt...'
                      : uploadStage === 'uploading'
                        ? 'Uploading receipt...'
                        : 'Saving...'}
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
