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
import { formatExpenseCategory } from '@/src/utils/format';
import { expensesService } from '@/services/expenses.service';
import { type Fund } from '@/services/funds.service';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { useQueryClient } from '@tanstack/react-query';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';

export default function AddExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    fundId: '',
    description: '',
    receipt: null as File | null,
  });

  const fundsQuery = useFundsListQuery(mosque?.id);
  const fundsLoading = fundsQuery.isLoading;
  const funds: Fund[] = fundsQuery.data ?? [];

  const selectedFund = funds.find((fund) => fund.id === formData.fundId);
  const categoryOptions = selectedFund?.allowedCategories ?? [];

  useEffect(() => {
    const masjidFund = funds.find((fund) => fund.type === 'MASJID');
    if (!masjidFund) return;

    setFormData((prev) => ({
      ...prev,
      fundId: prev.fundId || masjidFund.id,
    }));
  }, [funds]);

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
      let receiptUrl: string | undefined;
      if (formData.receipt) {
        const { url } = await expensesService.uploadReceipt(formData.receipt);
        receiptUrl = url;
      }

      const createdExpense = await expensesService.create({
        category: formData.category,
        amount: parsedAmount,
        description: formData.description,
        fundId: formData.fundId || undefined,
        receipt: receiptUrl,
      });

      queryClient.setQueriesData(
        {
          predicate: (query) => query.queryKey.some((part) => String(part) === 'expenses'),
        },
        (old: any) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: [createdExpense, ...old.data],
          };
        },
      );

      if (createdExpense?.status === 'PENDING') {
        queryClient.setQueryData(['expenses-pending-count', mosque?.id], (old: any) => {
          const current = Number(old?.count ?? 0);
          return { count: current + 1 };
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((part) => String(part) === 'expenses'),
        }),
        queryClient.invalidateQueries({ queryKey: ['expenses-pending-count', mosque?.id] }),
      ]);

      await invalidateMoneyQueries(queryClient);

      toast.success('Expense added successfully');
      router.push('/dashboard/expenses');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, receipt: file });
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
          <Link href="/dashboard/expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Expense</h1>
          <p className="text-muted-foreground">Record a new expense</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Expense Details</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the expense information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fund" className="text-sm font-medium text-foreground">
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
                <label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
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
                {selectedFund && categoryOptions.length === 0 ? (
                  <p className="text-xs text-amber-600">No categories available for this fund</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium text-foreground">
                  Amount (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="Describe the expense..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isLoading}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="receipt" className="text-sm font-medium text-foreground">
                Receipt (Optional)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('receipt')?.click()}
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
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Expense'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
