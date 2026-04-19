'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { expensesService } from '@/services/expenses.service';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatDate, formatExpenseCategory } from '@/src/utils/format';
import { invalidateExpenseMutationQueries, invalidateMoneyQueries } from '@/lib/money-cache';
import { queryKeys } from '@/lib/query-keys';

export default function PendingExpensesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mosque, token } = useAuthStore();
  const mosqueId = mosque?.id ?? 'none';
  const { isAdmin, isSuperAdmin } = usePermission();

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isSuperAdmin, router]);

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  const pendingQuery = useQuery({
    queryKey: queryKeys.expenses(mosqueId, {
      page: 1,
      pageSize: 50,
      status: 'PENDING',
      category: 'all',
      fundType: 'all',
      search: '',
    }),
    queryFn: () =>
      expensesService.getAll({
        page: 1,
        pageSize: 50,
        status: 'PENDING',
      }),
    enabled: Boolean(mosque?.id) && Boolean(token) && (isAdmin || isSuperAdmin),
    placeholderData: keepPreviousData,
  });

  const pendingQueryKey = queryKeys.expenses(mosqueId, {
    page: 1,
    pageSize: 50,
    status: 'PENDING',
    category: 'all',
    fundType: 'all',
    search: '',
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesService.approve(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: pendingQueryKey });
      const previous = queryClient.getQueryData(pendingQueryKey);
      queryClient.setQueryData(pendingQueryKey, (old: any) => {
        if (!old || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.filter((expense: { id: string }) => expense.id !== id),
        };
      });
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pendingQueryKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to approve expense'));
    },
    onSuccess: async () => {
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
      await invalidateMoneyQueries(queryClient);
      toast.success('Expense approved');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => expensesService.reject(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: pendingQueryKey });
      const previous = queryClient.getQueryData(pendingQueryKey);
      queryClient.setQueryData(pendingQueryKey, (old: any) => {
        if (!old || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.filter((expense: { id: string }) => expense.id !== id),
        };
      });
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pendingQueryKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to reject expense'));
    },
    onSuccess: async () => {
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
      await invalidateMoneyQueries(queryClient);
      toast.success('Expense rejected');
    },
  });

  const pendingExpenses = pendingQuery.data?.data ?? [];
  const busyId = (approveMutation.variables as string | undefined) || (rejectMutation.variables as string | undefined) || null;
  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="ds-section ds-stack">
      <PageHeader
        title="Pending Expenses"
        description="Review and approve or reject pending expense entries"
        backHref="/dashboard/expenses"
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/expenses">All Expenses</Link>
        </Button>
      </PageHeader>

      {pendingQuery.isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending expenses...
            </div>
          </CardContent>
        </Card>
      ) : pendingExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <ListEmptyState
              title="No pending expenses"
              description="All submitted expenses are already reviewed."
              actionLabel="Go to Expenses"
              actionHref="/dashboard/expenses"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="ds-stack">
          {pendingExpenses.map((expense) => {
            const rowBusy = isBusy && busyId === expense.id;
            return (
              <Card key={expense.id}>
                <CardContent className="overflow-hidden pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold" title={expense.description}>
                        {expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(expense.createdAt)}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600">-{formatCurrency(expense.amount, expense.currency)}</p>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{formatExpenseCategory(expense.category)}</Badge>
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">PENDING</Badge>
                  </div>

                  <p className="text-xs text-gray-500">{expense.fund?.type}</p>
                  <p className="text-sm truncate text-muted-foreground">
                    Added by: {expense.createdByName ?? 'Unknown'}
                    {expense.createdByRole ? ` (${expense.createdByRole.toLowerCase()})` : ''}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={rowBusy}
                      onClick={() => approveMutation.mutate(expense.id)}
                    >
                      {rowBusy && approveMutation.variables === expense.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={rowBusy}
                      onClick={() => rejectMutation.mutate(expense.id)}
                    >
                      {rowBusy && rejectMutation.variables === expense.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/expenses/${expense.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
