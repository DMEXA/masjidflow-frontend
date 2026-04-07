'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { FinancialChart } from '@/components/dashboard/financial-chart';
import { DonationChart } from '@/components/dashboard/donation-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { platformAdminService, type PlatformAnalytics } from '@/services/platform-admin.service';

const EMPTY_ANALYTICS: PlatformAnalytics = {
  mosquesPerMonth: [],
  usersPerMonth: [],
  revenuePerMonth: [],
  donationsProcessed: 0,
};

export default function PlatformAdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics>(EMPTY_ANALYTICS);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const data = await platformAdminService.getAnalytics();
      setAnalytics(data);
    };

    fetchAnalytics();
  }, []);

  const growthData = useMemo(() => {
    const revenueMap = new Map(analytics.revenuePerMonth.map((item) => [item.month, item.amount]));
    return analytics.mosquesPerMonth.map((item) => ({
      name: item.month,
      donations: revenueMap.get(item.month) ?? 0,
      expenses: analytics.usersPerMonth.find((u) => u.month === item.month)?.count ?? 0,
    }));
  }, [analytics]);

  const entityMixData = useMemo(
    () => [
      { type: 'Mosques Added', amount: analytics.mosquesPerMonth.reduce((sum, item) => sum + item.count, 0) },
      { type: 'Users Added', amount: analytics.usersPerMonth.reduce((sum, item) => sum + item.count, 0) },
      { type: 'Verified Donations', amount: analytics.donationsProcessed },
    ],
    [analytics],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Analytics"
        description="High-level trends across all mosques"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FinancialChart
          data={growthData}
          title="Revenue and User Growth"
          description="Monthly verified donation revenue and user additions"
        />
        <DonationChart
          data={entityMixData}
          title="Entity Mix"
          description="Added mosques, users, and verified donation volume"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          These analytics are generated from platform aggregate endpoints and are isolated from mosque-level
          dashboard calculations.
        </CardContent>
      </Card>
    </div>
  );
}
