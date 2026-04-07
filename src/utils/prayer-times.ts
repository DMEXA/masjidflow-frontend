import type { PrayerTimesSetting } from '@/services/mosque.service';

export type PrayerKey = 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah' | 'zawal';

export type PrayerClockEntry = {
  key: Exclude<PrayerKey, 'zawal' | 'jumuah'>;
  label: string;
  iqamahTime: string;
};

export type FullPrayerRow = {
  key: PrayerKey;
  label: string;
  azanTime: string | null;
  iqamahTime: string | null;
  zawalStart: string | null;
  zawalEnd: string | null;
  isZawal: boolean;
};

const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  zuhr: 'Zuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  jumuah: 'Jumuah',
  zawal: 'Zawal',
};

const ORDERED_KEYS: Array<Exclude<PrayerKey, 'zawal'>> = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
const NEXT_PRAYER_KEYS: Array<Exclude<PrayerKey, 'zawal' | 'jumuah'>> = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
const IST_TIME_ZONE = 'Asia/Kolkata';

export function format12Hour(timeText: string) {
  const [hh, mm] = timeText.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return timeText;

  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, '0')} ${period}`;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function getNowInKolkata(now: Date = new Date()) {
  const parts = getTimeZoneParts(now, IST_TIME_ZONE);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
}

function getTodayTimeInKolkata(hours: number, minutes: number, nowInKolkata: Date) {
  return new Date(
    nowInKolkata.getFullYear(),
    nowInKolkata.getMonth(),
    nowInKolkata.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

function minutesToTodayDate(minutes: number, nowInKolkata: Date) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return getTodayTimeInKolkata(hours, mins, nowInKolkata);
}

function normalizeHourForPrayer(prayerKey: Exclude<PrayerKey, 'zawal'>, hour: number) {
  // Backend may store some afternoon/evening iqamah values as 01:xx-07:xx.
  if (prayerKey !== 'fajr' && hour <= 7) {
    return hour + 12;
  }
  return hour;
}

function parseTimeToMinutes(
  timeStr: string,
  prayerKey?: Exclude<PrayerKey, 'zawal'>,
): number | null {
  const trimmed = timeStr.trim();
  const match = /^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/.exec(trimmed);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase() ?? null;
  if (Number.isNaN(rawHour) || Number.isNaN(minute) || minute < 0 || minute > 59) {
    return null;
  }

  let hour = rawHour;
  if (meridiem) {
    if (rawHour < 1 || rawHour > 12) return null;
    hour = rawHour % 12;
    if (meridiem === 'PM') hour += 12;
  } else {
    if (rawHour < 0 || rawHour > 23) return null;
    if (prayerKey) {
      hour = normalizeHourForPrayer(prayerKey, rawHour);
    }
  }

  return hour * 60 + minute;
}

function parseIqamahTimeForPrayer(
  prayerKey: Exclude<PrayerKey, 'zawal'>,
  timeStr: string,
  nowInKolkata: Date,
): Date | null {
  const minutes = parseTimeToMinutes(timeStr, prayerKey);
  if (minutes === null) return null;
  return minutesToTodayDate(minutes, nowInKolkata);
}

export function parseTimeToday(timeStr: string, now: Date = new Date()): Date | null {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return null;
  const nowInKolkata = getNowInKolkata(now);
  return minutesToTodayDate(minutes, nowInKolkata);
}

export function extractPrayerTimesFromSettings(settings: unknown): PrayerTimesSetting | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }

  const settingsObj = settings as Record<string, unknown>;
  if (!settingsObj.prayerTimes || typeof settingsObj.prayerTimes !== 'object' || Array.isArray(settingsObj.prayerTimes)) {
    return null;
  }

  return settingsObj.prayerTimes as PrayerTimesSetting;
}

export function getPrayerClockEntries(prayerTimes: PrayerTimesSetting | null): PrayerClockEntry[] {
  if (!prayerTimes) return [];

  return NEXT_PRAYER_KEYS.map((key) => ({
    key,
    label: PRAYER_LABELS[key],
    iqamahTime: prayerTimes[key]?.iqamahTime ?? '',
  })).filter((entry) => Boolean(entry.iqamahTime));
}

export function getNextPrayer(entries: PrayerClockEntry[], now: Date = new Date()) {
  if (entries.length === 0) return null;

  const nowInKolkata = getNowInKolkata(now);
  const nowMinutes = nowInKolkata.getHours() * 60 + nowInKolkata.getMinutes();

  const todaySorted = entries
    .map((entry) => ({
      ...entry,
      minutes: parseTimeToMinutes(entry.iqamahTime, entry.key),
    }))
    .filter((entry): entry is PrayerClockEntry & { minutes: number } => entry.minutes !== null)
    .sort((a, b) => a.minutes - b.minutes);

  if (todaySorted.length === 0) return null;

  let selected = todaySorted.find((entry) => entry.minutes > nowMinutes) ?? null;
  let date = selected ? minutesToTodayDate(selected.minutes, nowInKolkata) : null;

  if (!selected) {
    const firstPrayer = todaySorted[0];
    const nextDayDate = minutesToTodayDate(firstPrayer.minutes, nowInKolkata);
    nextDayDate.setDate(nextDayDate.getDate() + 1);
    selected = firstPrayer;
    date = nextDayDate;
  }

  return {
    key: selected.key,
    label: selected.label,
    date: date as Date,
  };
}

export function getFullPrayerRows(prayerTimes: PrayerTimesSetting | null): FullPrayerRow[] {
  if (!prayerTimes) return [];

  const regularRows: FullPrayerRow[] = ORDERED_KEYS.map((key) => ({
    key,
    label: PRAYER_LABELS[key],
    azanTime: prayerTimes[key]?.azanTime ?? null,
    iqamahTime: prayerTimes[key]?.iqamahTime ?? null,
    zawalStart: null,
    zawalEnd: null,
    isZawal: false,
  }));

  const zawalRow: FullPrayerRow = {
    key: 'zawal',
    label: PRAYER_LABELS.zawal,
    azanTime: null,
    iqamahTime: null,
    zawalStart: prayerTimes.zawal?.startTime ?? null,
    zawalEnd: prayerTimes.zawal?.endTime ?? null,
    isZawal: true,
  };

  return [...regularRows, zawalRow];
}

function isNowWithinRange(now: Date, start: Date, end: Date): boolean {
  if (end.getTime() >= start.getTime()) {
    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
  }

  // Handles edge cases when range wraps midnight.
  return now.getTime() >= start.getTime() || now.getTime() <= end.getTime();
}

export function getCurrentPrayerKey(prayerTimes: PrayerTimesSetting | null, now: Date = new Date()): PrayerKey | null {
  if (!prayerTimes) return null;

  const nowInKolkata = getNowInKolkata(now);

  const zawalStart = prayerTimes.zawal?.startTime ? parseTimeToday(prayerTimes.zawal.startTime, nowInKolkata) : null;
  const zawalEnd = prayerTimes.zawal?.endTime ? parseTimeToday(prayerTimes.zawal.endTime, nowInKolkata) : null;
  if (zawalStart && zawalEnd && isNowWithinRange(nowInKolkata, zawalStart, zawalEnd)) {
    return 'zawal';
  }

  const entries = ORDERED_KEYS
    .map((key) => ({
      key,
      label: PRAYER_LABELS[key],
      iqamahTime: prayerTimes[key]?.iqamahTime ?? '',
      date: prayerTimes[key]?.iqamahTime
        ? parseIqamahTimeForPrayer(key, prayerTimes[key].iqamahTime as string, nowInKolkata)
        : null,
    }))
    .filter((entry): entry is { key: Exclude<PrayerKey, 'zawal'>; label: string; iqamahTime: string; date: Date } => Boolean(entry.iqamahTime && entry.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (entries.length === 0) return null;

  for (let i = 0; i < entries.length; i += 1) {
    const current = entries[i];
    const next = entries[(i + 1) % entries.length];

    let nextDate = new Date(next.date);
    if (i === entries.length - 1) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    if (nowInKolkata.getTime() >= current.date.getTime() && nowInKolkata.getTime() < nextDate.getTime()) {
      return current.key;
    }
  }

  return entries[entries.length - 1].key;
}

export function getCountdownLabel(target: Date, now: Date = new Date()) {
  const deltaMs = Math.max(target.getTime() - now.getTime(), 0);
  const delta = Math.floor(deltaMs / 60000);

  const hours = Math.floor(delta / 60);
  const minutes = delta % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
