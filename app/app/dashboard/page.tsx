'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { muqtadisService, type MuqtadiDashboardApiResponse } from '@/services/muqtadis.service';
import { mosqueService, type PrayerTimesSetting } from '@/services/mosque.service';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import {
  formatTime,
  getCountdownLabel,
  getNextPrayer,
  getPrayerClockEntries,
  extractPrayerTimesFromSettings,
} from '@/src/utils/prayer-times';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEmptyState } from '@/components/common/list-empty-state';

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

type MuqtadiDashboardResponse = {
  dashboard: MuqtadiDashboardApiResponse;
  prayerTimes: PrayerTimesSetting | null;
  latestAnnouncement: AnnouncementItem | null;
};

function getStatusClasses(status: 'Paid' | 'Partial' | 'Pending') {
  if (status === 'Paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Partial') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

export default function MuqtadiDashboardPage() {
  const { mosque, user } = useAuthStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const dashboardQuery = useQuery<MuqtadiDashboardResponse>({
    queryKey: queryKeys.muqtadiDashboard(mosque?.id),
    enabled: Boolean(mosque?.id),
    staleTime: 30_000,
    queryFn: async () => {
      const [dashboardResponse, mosqueInfo] = await Promise.all([
        muqtadisService.getDashboard(),
        mosque?.id ? mosqueService.getById(mosque.id) : Promise.resolve(null),
      ]);

      if (typeof dashboardResponse?.expectedAmount !== 'number' || !Array.isArray(dashboardResponse.history)) {
        throw new Error(
          `Dashboard API missing required fields. expectedAmountType=${typeof dashboardResponse?.expectedAmount} historyIsArray=${String(Array.isArray(dashboardResponse?.history))}`,
        );
      }

      const settings = mosqueInfo?.settings;
      const settingsObj =
        settings && typeof settings === 'object' && !Array.isArray(settings)
          ? (settings as Record<string, unknown>)
          : null;
      const prayerConfig = extractPrayerTimesFromSettings(settingsObj);

      const announcements = Array.isArray(settingsObj?.announcements)
        ? (settingsObj.announcements as AnnouncementItem[])
        : [];

      return {
        dashboard: dashboardResponse,
        prayerTimes: prayerConfig,
        latestAnnouncement: announcements[0] ?? null,
      };
    },
  });

  useEffect(() => {
    if (dashboardQuery.error) {
      toast.error(getErrorMessage(dashboardQuery.error, 'Failed to load dashboard'));
    }
  }, [dashboardQuery.error]);

  const dashboard = useMemo(
    () => dashboardQuery.data?.dashboard ?? null,
    [dashboardQuery.data?.dashboard],
  );
  const prayerTimes = dashboardQuery.data?.prayerTimes ?? null;
  const latestAnnouncement = dashboardQuery.data?.latestAnnouncement ?? null;
  const lastPayment = dashboard?.history?.[0] ?? null;
  const lastPaymentStatus = (lastPayment?.status ?? '').toUpperCase();
  const needsProofResume = lastPaymentStatus === 'PENDING' || lastPaymentStatus === 'REJECTED';
  const lastPaymentResumeHref = useMemo(() => {
    if (!needsProofResume || !lastPayment) return '/app/pay?resumeProof=1';
    const params = new URLSearchParams({
      resumeProof: '1',
      paymentId: String(lastPayment.id),
      amount: String(lastPayment.amount ?? ''),
    });
    if (lastPayment.cycleId) params.set('cycleId', String(lastPayment.cycleId));
    if (lastPayment.dueId) params.set('dueId', String(lastPayment.dueId));
    if (lastPayment.method) params.set('method', String(lastPayment.method));
    return `/app/pay?${params.toString()}`;
  }, [lastPayment, needsProofResume]);

  const duesStatus = useMemo<'Paid' | 'Partial' | 'Pending'>(() => {
    const remaining = dashboard?.outstandingAmount ?? dashboard?.remainingAmount ?? 0;
    const paid = dashboard?.totalPaid ?? dashboard?.paidAmount ?? 0;

    if (remaining === 0) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Pending';
  }, [dashboard?.outstandingAmount, dashboard?.remainingAmount, dashboard?.totalPaid, dashboard?.paidAmount]);

  const paidProgress = useMemo(() => {
    const expected = dashboard?.totalDue ?? dashboard?.expectedAmount ?? 0;
    const paid = dashboard?.totalPaid ?? dashboard?.paidAmount ?? 0;
    if (expected <= 0) return 0;
    return Math.min(Math.max((paid / expected) * 100, 0), 100);
  }, [dashboard?.totalDue, dashboard?.expectedAmount, dashboard?.totalPaid, dashboard?.paidAmount]);

  const prayerEntries = useMemo(() => getPrayerClockEntries(prayerTimes), [prayerTimes]);

  const nextPrayer = useMemo(() => {
    const nowTime = new Date();
    const selected = getNextPrayer(prayerEntries, nowTime);
    if (!selected) return null;

    return {
      label: selected.label,
      time: selected.date,
      countdown: getCountdownLabel(selected.date, nowTime),
    };
  }, [prayerEntries]);

  const englishDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now),
    [now],
  );

  const hijriDate = useMemo(
    () =>
      `${new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now)} AH`,
    [now],
  );

  if (dashboardQuery.isLoading) {
    return (
      <div className="ds-stack">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <Card className="border-[#d8e5ce] bg-white">
        <CardContent className="pt-4">
          <p className="text-sm text-[#48664f]">Assalamu Alaikum, {user?.name ?? 'Muqtadi'}</p>
          <p className="mt-1 text-xl font-semibold text-[#1f4a29]">{mosque?.name || dashboard?.mosque?.name || 'Masjid'}</p>
          <p className="mt-2 text-sm text-[#48664f]">{englishDate}</p>
          <p className="text-sm text-[#48664f]">{hijriDate}</p>
        </CardContent>
      </Card>

      <Card className="border-[#d2dec8] bg-[#f6faf2]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-[#2f5531]">
            <Clock3 className="h-4 w-4" />
            Next Prayer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextPrayer ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[#5f7d61]">Next Prayer</p>
              <p className="text-3xl font-semibold leading-tight text-[#1f4a29]">{nextPrayer.label}</p>
              <p className="text-xs uppercase tracking-wide text-[#5f7d61]">Congregation Time</p>
              <p className="text-4xl font-bold leading-none text-[#1f4a29]">{formatTime(nextPrayer.time)}</p>
              <p className="pt-1 text-sm text-[#5f7d61]">Starts in {nextPrayer.countdown}</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/app/meekaat">View Full Prayer Times</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Prayer times not configured</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#2f6f3f]/20 bg-linear-to-r from-[#ecf6ee] to-[#f7fbf8]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#21522f]">Dues Summary</CardTitle>
        </CardHeader>
        <CardContent className="ds-stack">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2">
              <p className="text-[11px] text-[#5f7d61]">Total Due</p>
              <p className="text-sm font-semibold">{formatCurrency(dashboard?.totalDue ?? dashboard?.expectedAmount ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-2">
              <p className="text-[11px] text-[#5f7d61]">Total Paid</p>
              <p className="text-sm font-semibold">{formatCurrency(dashboard?.totalPaid ?? dashboard?.paidAmount ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-2">
              <p className="text-[11px] text-[#5f7d61]">Outstanding</p>
              <p className="text-sm font-semibold">{formatCurrency(dashboard?.outstandingAmount ?? dashboard?.remainingAmount ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#5f7d61]">
              <span>Progress</span>
              <span>{paidProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
              <div className="h-full rounded-full bg-[#2f6f3f]" style={{ width: `${paidProgress}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusClasses(duesStatus)}`}>
              {duesStatus}
            </span>
            <p className="text-xs text-[#48664f]">Month {dashboard?.month ?? '-'} / {dashboard?.year ?? '-'}</p>
          </div>

          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#5f7d61]">Last Payment</p>
            {lastPayment ? (
              <div className="mt-1">
                <p className="text-base font-semibold text-[#1f4a29]">{formatCurrency(lastPayment.amount)}</p>
                <div className="mt-1">
                  <Badge className={lastPaymentStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : lastPaymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'}>
                    {lastPaymentStatus || 'PENDING'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(lastPayment.createdAt))}
                </p>
                {needsProofResume ? (
                  <Button asChild size="sm" className="mt-3">
                    <Link href={lastPaymentResumeHref}>Continue Payment</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="mt-2">
                <ListEmptyState
                  title="No payments yet"
                  description="Make your first contribution to see payment history."
                  actionLabel="Pay Now"
                  actionHref="/app/pay"
                  className="min-h-32 bg-white"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#d8e5ce] bg-white">
        <CardHeader className="pb-2">
          <CardTitle>Latest Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          {latestAnnouncement ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#22492b]">{latestAnnouncement.title}</p>
              <p className="line-clamp-2 text-sm text-[#314235]">{latestAnnouncement.message}</p>
            </div>
          ) : (
            <ListEmptyState
              title="No announcements yet"
              description="Check the announcements page for new committee updates."
              actionLabel="View Announcements"
              actionHref="/app/announcements"
              className="min-h-32"
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-[#d8e5ce] bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/app/my-dues">View Payments</Link>
          </Button>
          {needsProofResume ? (
            <Button asChild className="w-full">
              <Link href={lastPaymentResumeHref}>
                Continue Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (dashboard?.outstandingAmount ?? dashboard?.remainingAmount ?? 0) > 0 ? (
            <Button asChild className="w-full">
              <Link href="/app/pay">
                Pay Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button disabled className="w-full">All Paid</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


