'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency, formatDate, formatPaymentType } from '@/src/utils/format';
import { usePermission } from '@/hooks/usePermission';
import { Skeleton } from '@/components/ui/skeleton';
import { getSafeLimit } from '@/src/utils/pagination';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { useDashboardOverviewQuery } from '@/hooks/useDashboardOverviewQuery';
import { CardSkeleton, ListSkeleton } from '@/components/common/loading-skeletons';
import {
  Receipt,
  Wallet,
  Users,
  CircleDollarSign,
  ArrowRight,
  Plus,
  QrCode,
} from 'lucide-react';

const FinancialChart = dynamic(
  () => import('@/components/dashboard/financial-chart').then((m) => m.FinancialChart),
  { ssr: false, loading: () => <Skeleton className="h-75 w-full" /> },
);

const DonationChart = dynamic(
  () => import('@/components/dashboard/donation-chart').then((m) => m.DonationChart),
  { ssr: false, loading: () => <Skeleton className="h-75 w-full" /> },
);

const ExpenseChart = dynamic(
  () => import('@/components/dashboard/expense-chart').then((m) => m.ExpenseChart),
  { ssr: false, loading: () => <Skeleton className="h-75 w-full" /> },
);

export default function DashboardPage() {
  const router = useRouter();
  const { mosque } = useAuthStore();
  const { canViewReports } = usePermission();
  const mosqueId = mosque?.id;
  const dashboardEnabled = canViewReports && Boolean(mosqueId);
  const chartsLimit = getSafeLimit(50);

  useEffect(() => {
    if (!canViewReports) {
      router.replace('/dashboard');
    }
  }, [canViewReports, router]);

  if (!canViewReports) {
    return null;
  }

  const dashboardQuery = useDashboardOverviewQuery({
    mosqueId,
    chartsLimit,
    enabled: dashboardEnabled,
  });

  const stats = dashboardQuery.data?.stats ?? { totalDonations: 0, totalExpenses: 0, net: 0, totalMembers: 0 };
  const hasError = Boolean(dashboardQuery.error);

  if (hasError) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Unable to load dashboard</CardTitle>
          <CardDescription className="text-muted-foreground">
            Some data failed to load. Please retry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              dashboardQuery.refetch();
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back{mosque ? `, ${mosque.name}` : ''}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your mosque&apos;s finances
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/expenses/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/donations/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Donation
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardQuery.isLoading ? (
          <>
            <CardSkeleton className="h-24 w-full" />
            <CardSkeleton className="h-24 w-full" />
            <CardSkeleton className="h-24 w-full" />
            <CardSkeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Donations"
              value={formatCurrency(stats.totalDonations, '₹')}
              description="All confirmed donation value"
              icon={Wallet}
              tone="green"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats.totalExpenses, '₹')}
              description="Recorded outgoing payments"
              icon={Receipt}
              tone="red"
            />
            <StatCard
              title="Net Balance"
              value={formatCurrency(stats.net, '₹')}
              description="Current remaining balance"
              icon={CircleDollarSign}
              tone="blue"
            />
            <StatCard
              title="Members"
              value={stats.totalMembers.toString()}
              description="Active members tracked"
              icon={Users}
              tone="purple"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {dashboardQuery.isLoading ? (
          <Card className="border-border p-6">
            <Skeleton className="h-75 w-full" />
          </Card>
        ) : dashboardQuery.error ? (
          <Card className="border-border p-6">
            <p className="text-sm text-muted-foreground">Charts are temporarily unavailable.</p>
          </Card>
        ) : (
          <FinancialChart
            data={dashboardQuery.data?.charts.chartData ?? []}
            title="Financial Overview"
            description="Monthly donations vs expenses"
            onCardClick={() => router.push('/dashboard/analytics')}
          />
        )}
        <div className="grid gap-6">
          {dashboardQuery.isLoading ? (
            <Card className="border-border p-6">
              <Skeleton className="h-75 w-full" />
            </Card>
          ) : dashboardQuery.error ? (
            <Card className="border-border p-6">
              <p className="text-sm text-muted-foreground">Donations chart is unavailable.</p>
            </Card>
          ) : (
            <DonationChart
              data={dashboardQuery.data?.charts.donationsByType ?? []}
              title="Donations by Payment Type"
              description="This month"
            />
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {dashboardQuery.isLoading ? (
          <Card className="border-border p-6">
            <Skeleton className="h-75 w-full" />
          </Card>
        ) : dashboardQuery.error ? (
          <Card className="border-border p-6">
            <p className="text-sm text-muted-foreground">Expenses chart is unavailable.</p>
          </Card>
        ) : (
          <ExpenseChart
            data={dashboardQuery.data?.charts.expensesByCategory ?? []}
            title="Expenses by Category"
            description="This month"
          />
        )}
        
        {/* Recent Donations */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Donations</CardTitle>
              <CardDescription className="text-muted-foreground">Latest donations received</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/donations">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <ListSkeleton count={3} className="h-12 w-full" />
            ) : (dashboardQuery.data?.recentDonations.length ?? 0) === 0 ? (
              <ListEmptyState
                title="No donations yet"
                description="Record your first donation to see recent activity here."
                actionLabel="Add Donation"
                actionHref="/dashboard/donations/add"
                className="min-h-36"
              />
            ) : (
              <div className="ds-stack">
                {(dashboardQuery.data?.recentDonations ?? []).map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{donation.donorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPaymentType(donation.paymentType)} • {formatDate(donation.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      +{formatCurrency(donation.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Donation QR</CardTitle>
            <CardDescription className="text-muted-foreground">
              Download your mosque donation QR code for printing.
            </CardDescription>
          </CardHeader>
          <CardContent className="ds-stack">
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Share one permanent QR across notice boards, counters, and donation boxes.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/donations/qr">View QR Code</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
