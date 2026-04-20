'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { muqtadisService, type ImamSalaryCycle } from '@/services/muqtadis.service';
import { formatCurrency, formatCycleLabel } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { queryKeys } from '@/lib/query-keys';
import { invalidateMuqtadiMutationQueries } from '@/lib/money-cache';
import { useAuthStore } from '@/src/store/auth.store';

type SortOrder = 'newest' | 'oldest';

function defaultMonthValue() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export default function ImamSalaryCyclesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mosque } = useAuthStore();
  const mosqueId = mosque?.id;
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const cyclesQuery = useQuery<ImamSalaryCycle[]>({
    queryKey: queryKeys.imamSalaryCycles(mosqueId),
    queryFn: () => muqtadisService.getSalaryMonths(),
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const createCycleMutation = useMutation({
    mutationFn: () =>
      muqtadisService.createSalaryMonth({
        month: currentPeriod.month,
        year: currentPeriod.year,
      }),
  });

  const isLoading = cyclesQuery.isLoading;
  const saving = createCycleMutation.isPending;
  const cycles = cyclesQuery.data ?? [];
  const currentPeriod = defaultMonthValue();
  const currentMonthExists = cycles.some(
    (entry) => entry.month === currentPeriod.month && entry.year === currentPeriod.year,
  );

  const sortedCycles = [...cycles].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? right - left : left - right;
  });

  useEffect(() => {
    if (cyclesQuery.error) {
      toast.error(getErrorMessage(cyclesQuery.error, 'Failed to load salary months'));
    }
  }, [cyclesQuery.error]);

  const startMonth = async () => {
    if (currentMonthExists) return;

    try {
      const created = await createCycleMutation.mutateAsync();
      toast.success(`Month created with ${formatCurrency(created.contributionAmount ?? created.perHead)} fixed contribution`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.imamSalaryCycles(mosqueId), exact: false }),
        invalidateMuqtadiMutationQueries(queryClient, mosqueId),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview(mosqueId), exact: false }),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create salary month'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Months"
        description="Start monthly salary dues from settings and review month history"
        backHref="/dashboard/imam-salary"
        backLabel="Back to Imam Salary"
        action={{
          label: 'Open Settings',
          onClick: () => router.push('/dashboard/settings'),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Start Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Starts dues for {formatCycleLabel(currentPeriod.month, currentPeriod.year)} using current salary settings.
          </p>
          <Button className="w-full md:w-auto" onClick={startMonth} disabled={saving || currentMonthExists}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Start Month
          </Button>
          {currentMonthExists ? (
            <p className="text-xs text-muted-foreground">
              A month record already exists for {formatCycleLabel(currentPeriod.month, currentPeriod.year)}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Month History</CardTitle>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm sm:w-40"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <ListEmptyState
              title="No salary months yet"
              description="Create your first month record from settings."
              actionLabel="Start Month"
              onAction={startMonth}
              className="min-h-40"
            />
          ) : (
            <div className="space-y-2">
              {sortedCycles.map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-medium">{formatCycleLabel(cycle.month, cycle.year)}</p>
                    <p className="text-muted-foreground">Total Salary: {formatCurrency(cycle.salaryAmount)}</p>
                    <p className="text-muted-foreground">Mode: {cycle.contributionMode ?? cycle.contributionType ?? 'HOUSEHOLD'}</p>
                  </div>
                  <div className="text-right">
                    <p>Contribution: {formatCurrency(cycle.contributionAmount ?? cycle.perHead)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(cycle.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
