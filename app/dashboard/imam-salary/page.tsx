'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Settings, CalendarDays, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { muqtadisService } from '@/services/muqtadis.service';
import { formatCurrency } from '@/src/utils/format';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';

export default function ImamSalaryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<{
    contributionMode: 'HOUSEHOLD' | 'PERSON';
    contributionAmount: number;
    totalSalary: number;
    totalMuqtadies: number;
    registeredMuqtadies: number;
    perHead: number;
  }>({
    contributionMode: 'HOUSEHOLD',
    contributionAmount: 0,
    totalSalary: 0,
    totalMuqtadies: 0,
    registeredMuqtadies: 0,
    perHead: 0,
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await muqtadisService.getSalarySummary();
        setSummary(data);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load salary summary'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imam Salary"
        description="Simple monthly salary model using settings as the single source of truth"
        action={{
          label: 'Open Settings',
          icon: Settings,
          onClick: () => router.push('/dashboard/settings'),
        }}
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contribution Mode</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{summary.contributionMode}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Fixed Contribution</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{formatCurrency(summary.contributionAmount)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Registered Muqtadis</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{summary.registeredMuqtadies}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Legacy Total Salary</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{formatCurrency(summary.totalSalary)}</p></CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Salary Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Update contribution mode and fixed contribution in one place.
            </p>
            <Button asChild className="w-full ">
              <Link href="/dashboard/settings">
                Open Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Salary Months
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create monthly records from settings. Contribution snapshot is fixed at creation.
            </p>
            <Button asChild className="w-full ">
              <Link href="/dashboard/imam-salary/cycles">
                Open Months
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
