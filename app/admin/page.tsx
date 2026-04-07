'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { FinancialChart } from '@/components/dashboard/financial-chart';
import { DonationChart } from '@/components/dashboard/donation-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformAdminService, type PlatformAdminStats } from '@/services/platform-admin.service';
import { formatCurrency } from '@/src/utils/format';
import {
  Building,
  Users,
  BadgeCheck,
  Hourglass,
  CircleAlert,
  HandCoins,
  ArrowRight,
} from 'lucide-react';

const EMPTY_STATS: PlatformAdminStats = {
  totalMosques: 0,
  totalUsers: 0,
  activeSubscriptions: 0,
  trialMosques: 0,
  expiredMosques: 0,
  totalDonationsAmount: 0,
};

export default function PlatformAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformAdminStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await platformAdminService.getStats();
        setStats(data);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const subscriptionMixData = useMemo(
    () => [
      { type: 'Active', amount: stats.activeSubscriptions },
      { type: 'Trial', amount: stats.trialMosques },
      { type: 'Expired', amount: stats.expiredMosques },
    ],
    [stats],
  );

  const platformOverviewData = useMemo(
    () => [
      {
        name: 'Platform',
        donations: Number(stats.totalDonationsAmount || 0),
        expenses: Number(stats.expiredMosques || 0),
      },
    ],
    [stats],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admin"
        description="Cross-mosque platform metrics and controls"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Mosques"
          value={loading ? 'Loading...' : String(stats.totalMosques)}
          icon={Building}
          iconClassName="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Total Users"
          value={loading ? 'Loading...' : String(stats.totalUsers)}
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Active Subscriptions"
          value={loading ? 'Loading...' : String(stats.activeSubscriptions)}
          icon={BadgeCheck}
          iconClassName="bg-green-100 text-green-700"
        />
        <StatCard
          title="Trial Mosques"
          value={loading ? 'Loading...' : String(stats.trialMosques)}
          icon={Hourglass}
          iconClassName="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Expired Mosques"
          value={loading ? 'Loading...' : String(stats.expiredMosques)}
          icon={CircleAlert}
          iconClassName="bg-rose-100 text-rose-700"
        />
        <StatCard
          title="Total Donations"
          value={loading ? 'Loading...' : formatCurrency(Number(stats.totalDonationsAmount || 0), '₹')}
          icon={HandCoins}
          iconClassName="bg-indigo-100 text-indigo-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FinancialChart
          data={platformOverviewData}
          title="Platform Donations"
          description="Aggregate donations and expired mosque count snapshot"
        />
        <DonationChart
          data={subscriptionMixData}
          title="Subscription Mix"
          description="Active, trial, and expired mosque distribution"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/mosques">
              Mosques
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/users">
              Users
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/subscriptions">
              Subscriptions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/analytics">
              Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/system">
              System
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
