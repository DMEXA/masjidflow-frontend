'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { expensesService } from '@/services/expenses.service';
import { type Fund } from '@/services/funds.service';
import { formatExpenseCategory } from '@/src/utils/format';
import type { Expense } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { useQueryClient } from '@tanstack/react-query';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';

export default function EditExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const { canManageExpenses } = usePermission();
  const { mosque } = useAuthStore();

  useEffect(() => {
    if (!canManageExpenses) {
      router.replace('/dashboard');
    }
  }, [canManageExpenses, router]);

  if (!canManageExpenses) {
    return null;
  }

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    fundId: '',
    description: '',
    newReceipt: null as File | null,
  });

  const fundsQuery = useFundsListQuery(mosque?.id);
  const fundsLoading = fundsQuery.isLoading;
  const funds: Fund[] = useMemo(() => fundsQuery.data ?? [], [fundsQuery.data]);
  const selectedFund = funds.find((fund) => fund.id === formData.fundId);
  const categoryOptions = (() => {
    const allowed = selectedFund?.allowedCategories ?? [];
    if (!formData.category || allowed.includes(formData.category)) {
      return allowed;
    }
    return [...allowed, formData.category];
  })();

  useEffect(() => {
    const masjidFund = funds.find((fund) => fund.type === 'MASJID');
    if (!masjidFund) return;

    setFormData((prev) => ({
      ...prev,
      fundId: prev.fundId || masjidFund.id,
    }));
  }, [funds]);

  useEffect(() => {
    const load = async () => {
      try {
        const expense: Expense = await expensesService.getById(params.id);
        setExistingReceipt(expense.receipt);
        setFormData({
          category: expense.category ?? '',
          amount: String(expense.amount),
          fundId: expense.fundId ?? '',
          description: expense.description ?? '',
          newReceipt: null,
        });
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load expense'));
        router.replace('/dashboard/expenses');
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

    if (!formData.fundId || !formData.category || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const parsedAmount = parseStrictAmountInput(formData.amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      let receiptUrl: string | undefined = existingReceipt;
      if (formData.newReceipt) {
        const { url } = await expensesService.uploadReceipt(formData.newReceipt);
        receiptUrl = url;
      }

      await expensesService.update(params.id, {
        category: formData.category,
        amount: parsedAmount,
        description: formData.description,
        fundId: formData.fundId || undefined,
        receipt: receiptUrl,
      });

      await invalidateMoneyQueries(queryClient);

      toast.success('Expense updated successfully');
      router.push(`/dashboard/expenses/${params.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          <Link href={`/dashboard/expenses/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Edit Expense
          </h1>
          <p className="text-muted-foreground">Update expense details</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Expense Details</CardTitle>
          <CardDescription className="text-muted-foreground">
            Edit the expense information and amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="fund"
                  className="text-sm font-medium text-foreground"
                >
                  Fund <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.fundId}
                  onValueChange={(value) => {
                    setFormData((prev) => {
                      const fund = funds.find((item) => item.id === value);
                      const allowedCategories = fund?.allowedCategories ?? [];
                      const nextCategory = allowedCategories.includes(prev.category)
                        ? prev.category
                        : '';
                      return {
                        ...prev,
                        fundId: value,
                        category: nextCategory,
                      };
                    });
                  }}
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
                  htmlFor="category"
                  className="text-sm font-medium text-foreground"
                >
                  Category <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((p) => ({
                      ...p,
                      category: value,
                    }))
                  }
                  disabled={isLoading || !selectedFund}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder={selectedFund ? 'Select category' : 'Select fund first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatExpenseCategory(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFund && selectedFund.allowedCategories.length === 0 ? (
                  <p className="text-xs text-amber-600">No categories available for this fund</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-foreground"
                >
                  Amount (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
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
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="Describe the expense..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                disabled={isLoading}
                rows={3}
                required
              />
            </div>

            {/* Receipt */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Receipt (Optional)
              </label>
              {existingReceipt && !formData.newReceipt && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-sm text-muted-foreground">
                    Current receipt attached
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById('receipt')?.click()
                  }
                  disabled={isLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {existingReceipt || formData.newReceipt
                    ? 'Replace Receipt'
                    : 'Upload Receipt'}
                </Button>
                {formData.newReceipt && (
                  <span className="truncate text-sm text-muted-foreground">
                    {formData.newReceipt.name}
                  </span>
                )}
              </div>
              <input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Expense
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/expenses/${params.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
