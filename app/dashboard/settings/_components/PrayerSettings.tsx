'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/src/store/auth.store';
import { queryKeys } from '@/lib/query-keys';
import {
  mosqueService,
  type PrayerTimesSetting,
  type PrayerTimesUpdateInput,
  type TimeWithPeriodInput,
} from '@/services/mosque.service';
import { getErrorMessage } from '@/src/utils/error';
import { invalidateMosqueLiveQueries } from '@/lib/realtime-invalidation';

type PrayerName = 'fajr' | 'zawal' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';

type PrayerRow = {
  prayer: PrayerName;
  label: string;
  azan: TimeWithPeriodInput;
  iqamah: TimeWithPeriodInput;
  isRange?: boolean;
};

const BASE_PRAYER_ROWS: PrayerRow[] = [
  { prayer: 'fajr', label: 'Fajr', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
  { prayer: 'zawal', label: 'Zawal', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' }, isRange: true },
  { prayer: 'zuhr', label: 'Zuhr', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
  { prayer: 'asr', label: 'Asr', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
  { prayer: 'maghrib', label: 'Maghrib', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
  { prayer: 'isha', label: 'Isha', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
  { prayer: 'jumuah', label: 'Jummah', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
];

function toTimePeriod(value: string): TimeWithPeriodInput {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return { time: '', period: 'AM' };
  }

  const hour24 = Number(match[1]);
  const minute = match[2];
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    time: `${String(hour12).padStart(2, '0')}:${minute}`,
    period,
  };
}

function isValid12HourInput(value: string): boolean {
  return /^(0[1-9]|1[0-2]):[0-5]\d$/.test(value.trim());
}

export function PrayerSettings() {
  const queryClient = useQueryClient();
  const { mosque: currentMosque } = useAuthStore();
  const [prayerRows, setPrayerRows] = useState<PrayerRow[]>(BASE_PRAYER_ROWS);
  const [snapshotRows, setSnapshotRows] = useState<PrayerRow[]>(BASE_PRAYER_ROWS);
  const [isEditing, setIsEditing] = useState(false);

  const prayerTimesQuery = useQuery({
    queryKey: queryKeys.prayerTimes(currentMosque?.id ?? 'none'),
    queryFn: () => mosqueService.getPrayerTimes(currentMosque!.id),
    enabled: Boolean(currentMosque?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });

  useEffect(() => {
    if (prayerTimesQuery.error) {
      toast.error(getErrorMessage(prayerTimesQuery.error, 'Failed to load prayer times settings'));
    }
  }, [prayerTimesQuery.error]);

  useEffect(() => {
    const prayerTimes = prayerTimesQuery.data;
    if (!currentMosque?.id) {
      return;
    }

    const nextRows =
      BASE_PRAYER_ROWS.map((row) => {
        const azanSource =
          row.prayer === 'zawal'
            ? prayerTimes?.zawal?.startTime || ''
            : ((prayerTimes?.[row.prayer as keyof PrayerTimesSetting] as { azanTime?: string } | undefined)
                ?.azanTime || '');

        const iqamahSource =
          row.prayer === 'zawal'
            ? prayerTimes?.zawal?.endTime || ''
            : ((prayerTimes?.[row.prayer as keyof PrayerTimesSetting] as { iqamahTime?: string } | undefined)
                ?.iqamahTime || '');

        return {
          ...row,
          azan: toTimePeriod(azanSource),
          iqamah: toTimePeriod(iqamahSource),
        };
      });

    setPrayerRows(nextRows);
    setSnapshotRows(nextRows);
  }, [currentMosque?.id, prayerTimesQuery.data]);

  const updatePrayerTimesMutation = useMutation({
    mutationFn: (payload: PrayerTimesUpdateInput) => mosqueService.updatePrayerTimes(currentMosque!.id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.prayerTimes(currentMosque?.id ?? 'none') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.mosqueSettings(currentMosque?.id ?? 'none') }),
        invalidateMosqueLiveQueries(queryClient, currentMosque?.id),
      ]);
    },
  });

  const onPrayerRowChange = (
    index: number,
    field: 'azan' | 'iqamah',
    part: 'time' | 'period',
    value: string,
  ) => {
    setPrayerRows((prev) =>
      prev.map((row, itemIndex) =>
        itemIndex === index
          ? {
              ...row,
              [field]: {
                ...row[field],
                [part]: value,
              },
            }
          : row,
      ),
    );
  };

  const handleSavePrayerSettings = async () => {
    if (!currentMosque?.id) {
      return;
    }

    const nextPrayerTimes: PrayerTimesUpdateInput = {
      fajr: { azanTime: { time: '', period: 'AM' } },
      zawal: { startTime: { time: '', period: 'AM' }, endTime: { time: '', period: 'AM' } },
      zuhr: { azanTime: { time: '', period: 'AM' } },
      asr: { azanTime: { time: '', period: 'AM' } },
      maghrib: { azanTime: { time: '', period: 'AM' } },
      isha: { azanTime: { time: '', period: 'AM' } },
      jumuah: { azanTime: { time: '', period: 'AM' } },
    };

    for (const row of prayerRows) {
      if (!row.azan.time) {
        toast.error(`${row.isRange ? 'Start' : 'Azan'} time is required for ${row.label}`);
        return;
      }

      if (row.isRange && !row.iqamah.time) {
        toast.error(`End time is required for ${row.label}`);
        return;
      }

      if (!row.isRange && !row.iqamah.time) {
        toast.error(`Iqamah time is required for ${row.label}`);
        return;
      }

      if (!isValid12HourInput(row.azan.time)) {
        toast.error(`Invalid ${row.isRange ? 'Start' : 'Azan'} time for ${row.label}`);
        return;
      }

      if (row.prayer === 'zawal') {
        nextPrayerTimes.zawal.startTime = {
          time: row.azan.time,
          period: row.azan.period,
        };
      } else {
        (nextPrayerTimes[row.prayer as keyof PrayerTimesUpdateInput] as { azanTime: TimeWithPeriodInput }).azanTime = {
          time: row.azan.time,
          period: row.azan.period,
        };
      }

      if (!isValid12HourInput(row.iqamah.time)) {
        toast.error(`Invalid ${row.isRange ? 'End' : 'Iqamah'} time for ${row.label}`);
        return;
      }

      if (row.prayer === 'zawal') {
        nextPrayerTimes.zawal.endTime = {
          time: row.iqamah.time,
          period: row.iqamah.period,
        };
      } else {
        (nextPrayerTimes[row.prayer as keyof PrayerTimesUpdateInput] as { iqamahTime?: TimeWithPeriodInput }).iqamahTime = {
          time: row.iqamah.time,
          period: row.iqamah.period,
        };
      }
    }

    try {
      await updatePrayerTimesMutation.mutateAsync(nextPrayerTimes);
      setSnapshotRows(prayerRows);
      setIsEditing(false);
      toast.success('Prayer times saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save prayer times'));
    }
  };

  const handleCancel = () => {
    setPrayerRows(snapshotRows);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Prayer Settings</CardTitle>
            <CardDescription>Review prayer timings and edit only when needed.</CardDescription>
          </div>
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Read-only summary</p>
          <p className="text-muted-foreground">Azan and Iqamah are available for every prayer row.</p>
        </div>

        <div className="hidden grid-cols-[1fr_220px_220px] gap-3 px-1 text-sm font-medium text-muted-foreground sm:grid">
          <p>Prayer</p>
          <p>Azan</p>
          <p>Iqamah</p>
        </div>

        {prayerRows.map((row, index) => (
          <div key={row.prayer} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_220px_220px] sm:items-center sm:border-0 sm:p-0">
            <Label className="font-medium">{row.label}</Label>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{row.isRange ? 'Start' : 'Azan'}</p>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <Input placeholder="hh:mm" value={row.azan.time} disabled={!isEditing} onChange={(e) => onPrayerRowChange(index, 'azan', 'time', e.target.value)} />
                <Select value={row.azan.period} disabled={!isEditing} onValueChange={(value: 'AM' | 'PM') => onPrayerRowChange(index, 'azan', 'period', value)}>
                  <SelectTrigger disabled={!isEditing}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{row.isRange ? 'End' : 'Iqamah'}</p>
              <div className="grid grid-cols-[1fr_90px] gap-2">
                <Input placeholder="hh:mm" value={row.iqamah.time} disabled={!isEditing} onChange={(e) => onPrayerRowChange(index, 'iqamah', 'time', e.target.value)} />
                <Select value={row.iqamah.period} disabled={!isEditing} onValueChange={(value: 'AM' | 'PM') => onPrayerRowChange(index, 'iqamah', 'period', value)}>
                  <SelectTrigger disabled={!isEditing}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        {isEditing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={updatePrayerTimesMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void handleSavePrayerSettings()} disabled={updatePrayerTimesMutation.isPending}>
              {updatePrayerTimesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
