'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { useAuthStore } from '@/src/store/auth.store';
import { mosqueService, type PrayerTimesSetting } from '@/services/mosque.service';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import {
  extractPrayerTimesFromSettings,
  format12Hour,
  getCurrentPrayerKey,
  getFullPrayerRows,
} from '@/src/utils/prayer-times';

function getPrayerAccent(prayerKey: string) {
  switch (prayerKey) {
    case 'fajr':
      return {
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        tint: 'bg-blue-50',
        border: 'border-blue-200',
      };
    case 'zuhr':
      return {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        tint: 'bg-amber-50',
        border: 'border-amber-200',
      };
    case 'asr':
      return {
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        tint: 'bg-orange-50',
        border: 'border-orange-200',
      };
    case 'maghrib':
      return {
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        tint: 'bg-rose-50',
        border: 'border-rose-200',
      };
    case 'isha':
      return {
        badge: 'bg-violet-100 text-violet-700 border-violet-200',
        tint: 'bg-violet-50',
        border: 'border-violet-200',
      };
    case 'jumuah':
      return {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        tint: 'bg-emerald-50',
        border: 'border-emerald-200',
      };
    case 'zawal':
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        tint: 'bg-slate-50',
        border: 'border-slate-200',
      };
    default:
      return {
        badge: 'bg-muted text-muted-foreground border-border',
        tint: 'bg-background',
        border: 'border-border',
      };
  }
}

export default function MeekaatPage() {
  const { mosque } = useAuthStore();

  const prayerTimesQuery = useQuery<PrayerTimesSetting | null>({
    queryKey: queryKeys.prayerTimes(mosque?.id ?? 'none'),
    enabled: Boolean(mosque?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      if (!mosque?.id) return null;
      const mosqueInfo = await mosqueService.getById(mosque.id);
      return extractPrayerTimesFromSettings(mosqueInfo.settings ?? null);
    },
  });

  const rows = useMemo(() => getFullPrayerRows(prayerTimesQuery.data ?? null), [prayerTimesQuery.data]);
  const currentPrayer = useMemo(
    () => getCurrentPrayerKey(prayerTimesQuery.data ?? null),
    [prayerTimesQuery.data],
  );
  const jumuahRow = rows.find((row) => row.key === 'jumuah') ?? null;
  const mainRows = rows.filter((row) => row.key !== 'jumuah');

  if (prayerTimesQuery.isLoading) {
    return (
      <div className="ds-stack">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <div className="rounded-xl border border-[#d8e5ce] bg-[#f6faf2] p-3">
        <MuqtadiBackButton />
      </div>

      <Card className="border-[#d8e5ce] bg-white">
        <CardHeader className="pb-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{mosque?.name || 'Masjid'}</p>
          <CardTitle className="text-xl">Today's Prayer Times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Prayer times not configured.</p>
          ) : (
            <>
              {jumuahRow ? (
                <div
                  className={`rounded-2xl border p-4 shadow-sm ${
                    currentPrayer === 'jumuah'
                      ? 'border-emerald-500 bg-emerald-50/70'
                      : 'border-emerald-200 bg-emerald-50/40'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-lg font-semibold text-emerald-900">Jumuah</p>
                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      {jumuahRow.iqamahTime ? format12Hour(jumuahRow.iqamahTime) : '--'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-emerald-100 bg-white p-2">
                      <p className="text-xs text-muted-foreground">Azan</p>
                      <p className="font-medium">{jumuahRow.azanTime ? format12Hour(jumuahRow.azanTime) : '--'}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-white p-2">
                      <p className="text-xs text-muted-foreground">Iqamah</p>
                      <p className="font-medium">{jumuahRow.iqamahTime ? format12Hour(jumuahRow.iqamahTime) : '--'}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                {mainRows.map((row) => {
                  const accent = getPrayerAccent(row.key);
                  const isCurrent = currentPrayer === row.key;

                  return (
                    <div
                      key={row.key}
                      className={`rounded-2xl border p-4 shadow-sm transition ${
                        isCurrent
                          ? `border-2 ${accent.border} ${accent.tint}`
                          : 'border-border bg-white'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-foreground">{row.label}</p>
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${accent.badge}`}>
                          {row.isZawal
                            ? row.zawalStart && row.zawalEnd
                              ? `${format12Hour(row.zawalStart)} -> ${format12Hour(row.zawalEnd)}`
                              : '--'
                            : row.iqamahTime
                              ? format12Hour(row.iqamahTime)
                              : '--'}
                        </span>
                      </div>

                      {row.isZawal ? (
                        <div className="rounded-xl border border-slate-100 bg-white p-2 text-sm">
                          <p className="text-xs text-muted-foreground">Range</p>
                          <p className="font-medium">
                            {row.zawalStart && row.zawalEnd
                              ? `${format12Hour(row.zawalStart)} -> ${format12Hour(row.zawalEnd)}`
                              : '--'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl border bg-white p-2">
                            <p className="text-xs text-muted-foreground">Azan</p>
                            <p className="font-medium">{row.azanTime ? format12Hour(row.azanTime) : '--'}</p>
                          </div>
                          <div className="rounded-xl border bg-white p-2">
                            <p className="text-xs text-muted-foreground">Iqamah</p>
                            <p className="font-medium">{row.iqamahTime ? format12Hour(row.iqamahTime) : '--'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

