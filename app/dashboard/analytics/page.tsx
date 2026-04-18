'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { getSafeLimit } from '@/src/utils/pagination';
import { formatCurrency } from '@/src/utils/format';
import { useDashboardOverviewQuery } from '@/hooks/useDashboardOverviewQuery';
import { FinancialChart } from '@/components/dashboard/financial-chart';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
  const router = useRouter();
  const { mosque } = useAuthStore();
  const { canViewReports } = usePermission();
  const mosqueId = mosque?.id;
  const chartsLimit = getSafeLimit(50);
  const [selectedFundId, setSelectedFundId] = useState<string>('');

  const analyticsQuery = useDashboardOverviewQuery({
    mosqueId,
    chartsLimit,
    enabled: canViewReports && Boolean(mosqueId),
  });

  useEffect(() => {
    if (!canViewReports) {
      router.replace('/dashboard');
    }
  }, [canViewReports, router]);

  useEffect(() => {
    const firstFundId = analyticsQuery.data?.charts.funds?.[0]?.fundId;
    if (!selectedFundId && firstFundId) {
      setSelectedFundId(firstFundId);
    }
  }, [analyticsQuery.data?.charts.funds, selectedFundId]);

  const baseChartData = useMemo(() => analyticsQuery.data?.charts.chartData ?? [], [analyticsQuery.data?.charts.chartData]);
  const funds = analyticsQuery.data?.charts.funds ?? [];
  const selectedFund = funds.find((fund) => fund.fundId === selectedFundId) ?? null;

  const chartData = useMemo(() => {
    return MONTH_NAMES.map((monthName) => {
      const sourceMonth = baseChartData.find((row) => row.name === monthName);
      const fundMonth = selectedFundId ? sourceMonth?.funds?.[selectedFundId] : undefined;

      return {
        name: monthName,
        donations: fundMonth?.donations ?? 0,
        expenses: fundMonth?.expenses ?? 0,
      };
    });
  }, [baseChartData, selectedFundId]);

  if (!canViewReports) {
    return null;
  }

  if (analyticsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
        <div className="h-52 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (analyticsQuery.error) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Unable to load analytics</CardTitle>
          <CardDescription>Please retry loading this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => analyticsQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Drill down into monthly trends for one fund at a time.</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Fund Selector</CardTitle>
          <CardDescription>Choose a fund to view monthly donations and expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedFundId}
            onChange={(event) => setSelectedFundId(event.target.value)}
          >
            {funds.length === 0 ? <option value="">No funds available</option> : null}
            {funds.map((fund) => (
              <option key={fund.fundId} value={fund.fundId}>
                {fund.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <FinancialChart
        data={chartData}
        title="Monthly Financial Overview"
        description={selectedFund ? `${selectedFund.name}: donations vs expenses` : 'Select a fund to view monthly trend'}
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Monthly Scroll</CardTitle>
          <CardDescription>Swipe horizontally for Jan-Dec month snapshots.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
            {MONTH_NAMES.map((month) => {
              const monthData = chartData.find((row) => row.name === month) ?? { donations: 0, expenses: 0 };
              return (
                <div key={month} className="min-w-40 shrink-0 rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{month}</p>
                  <p className="mt-2 text-xs text-emerald-600">Donations: {formatCurrency(monthData.donations, '₹')}</p>
                  <p className="mt-1 text-xs text-rose-500">Expenses: {formatCurrency(monthData.expenses, '₹')}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
