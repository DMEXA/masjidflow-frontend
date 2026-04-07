'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, FileText, Receipt } from 'lucide-react';
import { expensesService } from '@/services/expenses.service';
import { formatCurrency, formatDate, formatExpenseCategory } from '@/src/utils/format';
import type { Expense } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { usePermission } from '@/hooks/usePermission';

const categoryColors: Record<string, string> = {
  utilities: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  salaries: 'bg-green-100 text-green-800',
  events: 'bg-purple-100 text-purple-800',
  supplies: 'bg-orange-100 text-orange-800',
  charity: 'bg-pink-100 text-pink-800',
  education: 'bg-cyan-100 text-cyan-800',
  construction: 'bg-gray-100 text-gray-800',
  other: 'bg-slate-100 text-slate-800',
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canManageExpenses } = usePermission();

  useEffect(() => {
    if (!canManageExpenses) {
      router.replace('/dashboard');
    }
  }, [canManageExpenses, router]);

  if (!canManageExpenses) {
    return null;
  }

  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const data = await expensesService.getById(params.id);
        setExpense(data);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load expense details'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpense();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Expense not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/expenses">Back to Expenses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Expense Details
          </h1>
          <p className="text-sm text-muted-foreground">ID: {expense.id}</p>
        </div>
      </div>

      {/* Amount highlight card */}
      <Card className="border-border bg-red-50 dark:bg-red-950/20">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <Receipt className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Spent</p>
            <p className="text-3xl font-bold text-red-600">
              -{formatCurrency(expense.amount, expense.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Details card */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Expense Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Category
              </p>
              <Badge
                className={
                  categoryColors[expense.category] || categoryColors.other
                }
              >
                {formatExpenseCategory(expense.category)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="text-sm text-foreground">
                {formatDate(expense.createdAt)}
              </p>
            </div>

            {expense.vendor && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vendor / Payee
                </p>
                <p className="text-sm text-foreground">{expense.vendor}</p>
              </div>
            )}

            {expense.createdByName && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recorded By
                </p>
                <p className="text-sm text-foreground">
                  {expense.createdByName}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </p>
            <p className="text-sm text-foreground">{expense.description}</p>
          </div>

          {expense.receipt && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Receipt
                </p>
                <Link
                  href={expense.receipt}
                  className="text-blue-600 underline"
                >
                  View Proof
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/expenses">Back to Expenses</Link>
        </Button>
      </div>
    </div>
  );
}
