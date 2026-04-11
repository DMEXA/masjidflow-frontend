'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, Globe, Loader2, Save, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { queryKeys } from '@/lib/query-keys';
import {
  mosqueService,
  updateMosqueProfile,
  type PrayerTimesSetting,
  type PrayerTimesUpdateInput,
  type TimeWithPeriodInput,
  type UpdateMosqueData,
} from '@/services/mosque.service';
import { muqtadisService, type ContributionMode, type ImamSalaryCycle, type NextCycleInfo } from '@/services/muqtadis.service';
import { paymentSettingsService } from '@/services/payment-settings.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatCycleLabel } from '@/src/utils/format';
import { parseStrictAmountInput } from '@/src/utils/numeric-input';
import { ListEmptyState } from '@/components/common/list-empty-state';

type PrayerName = 'fajr' | 'zawal' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';
type SortOrder = 'newest' | 'oldest';
type NextCycleMode = 'use-current' | 'update-next';

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
  { prayer: 'jumuah', label: 'Jumuah', azan: { time: '', period: 'AM' }, iqamah: { time: '', period: 'AM' } },
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

function getCurrentMonthPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function getRemainingTime(startsAtIso: string) {
  const startsAt = new Date(startsAtIso);
  const now = new Date();
  const remainingMs = Math.max(startsAt.getTime() - now.getTime(), 0);
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return { days, hours, minutes };
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mosque: currentMosque, user } = useAuthStore();
  const { canManageSettings } = usePermission();

  const fieldClass = 'w-full rounded-xl px-4 py-3';

  const [formData, setFormData] = useState({
    name: '',
    village: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    description: '',
  });

  const [notifications, setNotifications] = useState({
    emailDonations: true,
    emailExpenses: true,
    emailReports: false,
    emailMembers: true,
  });

  const [salarySaving, setSalarySaving] = useState(false);
  const [salarySettingsLockedFallback, setSalarySettingsLockedFallback] = useState(false);
  const [salarySettingsLockReasonFallback, setSalarySettingsLockReasonFallback] = useState<string | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    contributionMode: 'HOUSEHOLD' as ContributionMode,
    contributionAmount: '',
  });
  const [applyToCurrentMonth, setApplyToCurrentMonth] = useState(false);
  const [applyCurrentMonthBlockedReason, setApplyCurrentMonthBlockedReason] = useState<string | null>(null);
  const [isApplyCurrentMonthConfirmOpen, setIsApplyCurrentMonthConfirmOpen] = useState(false);
  const [nextCycleMode, setNextCycleMode] = useState<NextCycleMode>('use-current');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [nextCycleLoaded, setNextCycleLoaded] = useState(false);

  const [monthLoading, setMonthLoading] = useState(false);
  const [monthSaving, setMonthSaving] = useState(false);
  const [cycles, setCycles] = useState<ImamSalaryCycle[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const [securityLoading, setSecurityLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_upi: '',
    phone_number: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    payment_instructions: '',
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false);

  const [prayerRows, setPrayerRows] = useState<PrayerRow[]>(BASE_PRAYER_ROWS);
  const salarySettingsLoadedRef = useRef(false);
  const salaryMonthsLoadedRef = useRef(false);

  const currentPeriod = getCurrentMonthPeriod();
  const currentMonthExists = cycles.some(
    (entry) => entry.month === currentPeriod.month && entry.year === currentPeriod.year,
  );
  const currentCycle = cycles.find(
    (entry) => entry.month === currentPeriod.month && entry.year === currentPeriod.year,
  );

  const contributionAmountNumber = parseStrictAmountInput(salaryForm.contributionAmount) ?? 0;
  const currentCycleContributionAmount = Number(
    currentCycle?.contributionAmount ?? currentCycle?.ratePerPerson ?? currentCycle?.perHead ?? 0,
  );
  const currentCycleContributionMode =
    ((currentCycle?.contributionMode ?? currentCycle?.contributionType ?? 'HOUSEHOLD') as ContributionMode);
  const hasCurrentMonthRateMismatch =
    Boolean(currentCycle) && contributionAmountNumber > 0 && (
      currentCycleContributionMode !== salaryForm.contributionMode
      || Math.abs(currentCycleContributionAmount - contributionAmountNumber) >= 0.01
    );
  const backendReportedPaymentsStarted = Boolean((currentCycle as any)?.paymentsStarted === true);
  const applyToCurrentMonthDisabled =
    !hasCurrentMonthRateMismatch ||
    backendReportedPaymentsStarted ||
    Boolean(applyCurrentMonthBlockedReason) ||
    salarySaving;

  useEffect(() => {
    if (!hasCurrentMonthRateMismatch) {
      setApplyToCurrentMonth(false);
    }
  }, [hasCurrentMonthRateMismatch]);

  useEffect(() => {
    if (backendReportedPaymentsStarted) {
      setApplyCurrentMonthBlockedReason('Current month already has payment activity, so this update cannot be applied retroactively.');
      setApplyToCurrentMonth(false);
    }
  }, [backendReportedPaymentsStarted]);

  const sortedCycles = [...cycles].sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? right - left : left - right;
  });

  useEffect(() => {
    if (!canManageSettings) {
      router.replace('/dashboard');
    }
  }, [canManageSettings, router]);

  if (!canManageSettings) {
    return null;
  }

  useEffect(() => {
    setEmailOtpEnabled(Boolean(user?.emailOtpEnabled));
  }, [user?.emailOtpEnabled]);

  useEffect(() => {
    if (salarySettingsLoadedRef.current) {
      return;
    }
    salarySettingsLoadedRef.current = true;

    const loadSalarySettings = async () => {
      try {
        const settings = await muqtadisService.getSettings();
        setSalaryForm({
          contributionMode: settings.contributionMode,
          contributionAmount: settings.contributionAmount > 0 ? String(settings.contributionAmount) : '',
        });
        setSalarySettingsLockedFallback(Boolean(settings.settingsLocked));
        setSalarySettingsLockReasonFallback(settings.settingsLockReason ?? null);

        const settingsAny = settings as any;
        if (settingsAny?.currentMonthPaymentsStarted === true) {
          setApplyCurrentMonthBlockedReason('Current month already has payment activity, so this update cannot be applied retroactively.');
          setApplyToCurrentMonth(false);
        }
      } catch (error) {
        setSalaryForm({ contributionMode: 'HOUSEHOLD', contributionAmount: '' });
        toast.error(getErrorMessage(error, 'Failed to load salary settings'));
      }
    };

    void loadSalarySettings();
  }, []);

  const loadSalaryMonths = async () => {
    setMonthLoading(true);
    try {
      const monthList = await muqtadisService.getSalaryMonths();
      setCycles(monthList);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load salary months'));
    } finally {
      setMonthLoading(false);
    }
  };

  useEffect(() => {
    if (salaryMonthsLoadedRef.current) {
      return;
    }
    salaryMonthsLoadedRef.current = true;

    void loadSalaryMonths();
  }, []);

  const paymentSettingsQuery = useQuery({
    queryKey: ['payment-settings', currentMosque?.id ?? 'none'],
    queryFn: () => paymentSettingsService.get(),
    enabled: Boolean(currentMosque?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    if (paymentSettingsQuery.error) {
      toast.error(getErrorMessage(paymentSettingsQuery.error, 'Failed to load payment settings'));
    }
  }, [paymentSettingsQuery.error]);

  useEffect(() => {
    const saved = paymentSettingsQuery.data;
    if (!saved) {
      return;
    }

    setPaymentForm({
      payment_upi: saved.upiId ?? '',
      phone_number: saved.phoneNumber ?? saved.adminWhatsappNumber ?? '',
      bank_account_name: saved.bankAccountName ?? '',
      bank_account_number: saved.bankAccount ?? '',
      bank_ifsc: saved.ifsc ?? '',
      bank_name: saved.bankName ?? '',
      payment_instructions: saved.paymentInstructions ?? '',
    });
  }, [paymentSettingsQuery.data]);

  const getMosqueDetails = async () => {
    if (!currentMosque?.id) {
      throw new Error('Mosque not found');
    }
    return mosqueService.getById(currentMosque.id);
  };

  const { data: mosque, isLoading } = useQuery({
    queryKey: ['mosque'],
    queryFn: getMosqueDetails,
    enabled: Boolean(currentMosque?.id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const prayerTimesQuery = useQuery({
    queryKey: queryKeys.prayerTimes(currentMosque?.id ?? 'none'),
    queryFn: () => mosqueService.getPrayerTimes(currentMosque!.id),
    enabled: Boolean(currentMosque?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const nextCycleInfoQuery = useQuery<NextCycleInfo>({
    queryKey: ['muqtadi-next-cycle-info'],
    queryFn: () => muqtadisService.getNextCycleInfo(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const hasActiveCycle = nextCycleInfoQuery.data?.hasActiveCycle === true;
  const settingsLocked = Boolean(nextCycleInfoQuery.data?.settingsLocked ?? salarySettingsLockedFallback);
  const settingsLockReason =
    nextCycleInfoQuery.data?.settingsLockReason
    ?? salarySettingsLockReasonFallback
    ?? 'Settings are locked because payments have already started in this cycle. You can update them for the next cycle.';

  useEffect(() => {
    if (nextCycleInfoQuery.error) {
      toast.error(getErrorMessage(nextCycleInfoQuery.error, 'Failed to load next cycle info'));
    }
  }, [nextCycleInfoQuery.error]);

  useEffect(() => {
    if (!hasActiveCycle) {
      setCountdown({ days: 0, hours: 0, minutes: 0 });
      return;
    }

    const startsAt = nextCycleInfoQuery.data?.nextCycle?.startsAt;
    if (!startsAt) {
      return;
    }

    const update = () => setCountdown(getRemainingTime(startsAt));
    update();
    const timerId = window.setInterval(update, 60_000);
    return () => window.clearInterval(timerId);
  }, [hasActiveCycle, nextCycleInfoQuery.data?.nextCycle?.startsAt]);

  useEffect(() => {
    const nextInfo = nextCycleInfoQuery.data;
    if (!nextInfo || nextCycleLoaded) {
      return;
    }

    if (!nextInfo.hasActiveCycle) {
      setNextCycleMode('update-next');
      setApplyToCurrentMonth(false);
      setNextCycleLoaded(true);
      return;
    }

    if (nextInfo.hasPendingSettings) {
      setNextCycleMode('update-next');
      setSalaryForm({
        contributionMode: nextInfo.settings.contributionMode,
        contributionAmount: Number(nextInfo.settings.contributionAmount) > 0
          ? String(nextInfo.settings.contributionAmount)
          : '',
      });
    }

    setNextCycleLoaded(true);
  }, [nextCycleInfoQuery.data, nextCycleLoaded]);

  const updatePrayerTimesMutation = useMutation({
    mutationFn: (payload: PrayerTimesUpdateInput) =>
      mosqueService.updatePrayerTimes(currentMosque!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.prayerTimes(currentMosque?.id ?? 'none') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mosqueSettings(currentMosque?.id ?? 'none') });
    },
  });

  useEffect(() => {
    if (mosque) {
      setFormData({
        name: mosque.name || '',
        state: mosque.state || '',
        city: mosque.city || '',
        village: (mosque as { village?: string }).village || '',
        phone: mosque.phone || '',
        website: mosque.website || '',
        description: mosque.description || '',
        address: mosque.address || '',
        country: mosque.country || 'India',
        email: mosque.email || '',
      });
    }
  }, [mosque]);

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

    setPrayerRows(
      BASE_PRAYER_ROWS.map((row) => ({
        ...row,
        azan: toTimePeriod(
          row.prayer === 'zawal'
            ? prayerTimes?.zawal?.startTime || ''
            : ((prayerTimes?.[row.prayer as keyof PrayerTimesSetting] as { azanTime?: string } | undefined)
                ?.azanTime || ''),
        ),
        iqamah: toTimePeriod(
          row.prayer === 'zawal'
            ? prayerTimes?.zawal?.endTime || ''
            : ((prayerTimes?.[row.prayer as keyof PrayerTimesSetting] as { iqamahTime?: string } | undefined)
                ?.iqamahTime || ''),
        ),
      })),
    );
  }, [currentMosque?.id, prayerTimesQuery.data]);

  const mosqueProfileMutation = useMutation({
    mutationFn: (data: UpdateMosqueData) => {
      if (!currentMosque?.id) {
        throw new Error('Mosque not found');
      }
      return updateMosqueProfile(currentMosque.id, data);
    },
    onSuccess: (updatedMosque) => {
      toast.success('Settings updated');
      useAuthStore.setState((state) => ({
        ...state,
        mosque: state.mosque ? { ...state.mosque, ...updatedMosque } : updatedMosque,
      }));
      setFormData((prev) => ({
        ...prev,
        name: updatedMosque.name ?? prev.name,
        address: updatedMosque.address ?? prev.address,
        phone: updatedMosque.phone ?? prev.phone,
        email: updatedMosque.email ?? prev.email,
      }));
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  const handleSubmitGeneralSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: UpdateMosqueData = {
      name: formData.name,
      address: formData.address,
      state: formData.state,
      city: formData.city,
      village: formData.village,
      phone: formData.phone,
      email: formData.email || undefined,
      website: formData.website || undefined,
      description: formData.description || undefined,
    };

    mosqueProfileMutation.mutate(payload);
  };

  const saveSalarySettings = async (applyNow: boolean) => {
    if (settingsLocked) {
      toast.error('Cannot change settings after payments have started. Changes will apply to next cycle.');
      return;
    }

    if (hasActiveCycle && !applyNow && nextCycleMode === 'use-current') {
      const fallbackSettings = nextCycleInfoQuery.data?.settings;
      const fallbackAmount = Number(fallbackSettings?.contributionAmount ?? fallbackSettings?.totalSalary ?? 0);
      const contributionAmountValue =
        parseStrictAmountInput(salaryForm.contributionAmount)
        ?? (Number.isFinite(fallbackAmount) ? fallbackAmount : 0);
      const contributionModeValue =
        (salaryForm.contributionMode || fallbackSettings?.contributionMode || 'HOUSEHOLD') as ContributionMode;

      if (!Number.isFinite(contributionAmountValue) || contributionAmountValue <= 0) {
        toast.error('Load current salary settings before saving');
        return;
      }

      setSalarySaving(true);
      try {
        await muqtadisService.updateSettings({
          contributionMode: contributionModeValue,
          contributionAmount: contributionAmountValue,
          imamSalarySystem: 'EQUAL',
          totalSalary: contributionAmountValue,
          applyToCurrentMonth: false,
          useCurrentSettingsForNextCycle: true,
        });
        await nextCycleInfoQuery.refetch();
        toast.success('Next cycle will continue with current settings');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update salary settings'));
      } finally {
        setSalarySaving(false);
      }
      return;
    }

    const contributionAmountValue = parseStrictAmountInput(salaryForm.contributionAmount);

    if (contributionAmountValue === null || contributionAmountValue <= 0) {
      toast.error('Contribution amount must be greater than 0');
      return;
    }

    if (applyNow && applyToCurrentMonthDisabled) {
      toast.error('Cannot apply to current month right now');
      return;
    }

    setSalarySaving(true);
    try {
      const updated = await muqtadisService.updateSettings({
        contributionMode: salaryForm.contributionMode,
        contributionAmount: contributionAmountValue,
        imamSalarySystem: 'EQUAL',
        totalSalary: contributionAmountValue,
        applyToCurrentMonth: applyNow,
        isNextMonth: hasActiveCycle && !applyNow && nextCycleMode === 'update-next',
        useCurrentSettingsForNextCycle: hasActiveCycle && !applyNow && nextCycleMode === 'use-current',
      });

      if (applyNow) {
        setSalaryForm({
          contributionMode: updated.contributionMode,
          contributionAmount: String(updated.contributionAmount),
        });
      }

      if (applyNow) {
        setApplyToCurrentMonth(false);
        setIsApplyCurrentMonthConfirmOpen(false);
      }
      setApplyCurrentMonthBlockedReason(null);
      await loadSalaryMonths();
      await nextCycleInfoQuery.refetch();
      if (applyNow) {
        toast.success('Salary settings updated');
      } else if (nextCycleMode === 'update-next') {
        toast.success('Will apply next month');
      } else {
        toast.success('Next cycle will continue with current settings');
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update salary settings');
      if (message.includes('Cannot update current month salary after payments have started')) {
        setApplyCurrentMonthBlockedReason('Current month already has payment activity, so this update cannot be applied retroactively.');
        setApplyToCurrentMonth(false);
      }
      toast.error(message);
    } finally {
      setSalarySaving(false);
    }
  };

  const handleSaveSalarySettings = async () => {
    if (applyToCurrentMonth) {
      setIsApplyCurrentMonthConfirmOpen(true);
      return;
    }
    await saveSalarySettings(false);
  };

  const handleStartMonth = async () => {
    if (currentMonthExists) {
      return;
    }

    setMonthSaving(true);
    try {
      const created = await muqtadisService.createSalaryMonth({
        month: currentPeriod.month,
        year: currentPeriod.year,
      });
      toast.success(`Month created with ${formatCurrency(created.contributionAmount ?? created.perHead)} fixed contribution`);
      await loadSalaryMonths();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create salary month'));
    } finally {
      setMonthSaving(false);
    }
  };

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

      if (row.iqamah.time) {
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
    }

    try {
      await updatePrayerTimesMutation.mutateAsync(nextPrayerTimes);
      toast.success('Prayer times saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save prayer times'));
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please complete all password fields');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setSecurityLoading(true);
    try {
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      toast.success(result.message || 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    setSecurityLoading(true);
    try {
      const data = await authService.setupTwoFactorAuthenticated();
      setTwoFactorSecret(data.manualCode);
      toast.success('2FA setup created. Enter code from your authenticator app to enable.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to setup two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!twoFactorCode.trim()) {
      toast.error('Enter your 6-digit authenticator code');
      return;
    }

    setSecurityLoading(true);
    try {
      const result = await authService.enableTwoFactor(twoFactorCode.trim());
      toast.success(result.message || 'Two-factor authentication enabled');
      setTwoFactorCode('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to enable two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleToggleEmailOtp = async (enabled: boolean) => {
    setSecurityLoading(true);
    try {
      const result = await authService.setEmailOtp(enabled);
      setEmailOtpEnabled(enabled);
      toast.success(result.message || (enabled ? 'Email OTP enabled' : 'Email OTP disabled'));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update Email OTP setting'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setSecurityLoading(true);
    try {
      const result = await authService.disableTwoFactor();
      setTwoFactorSecret(null);
      setTwoFactorCode('');
      setEmailOtpEnabled(false);
      toast.success(result.message || 'Two-factor authentication disabled');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disable two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    const mosqueId = currentMosque?.id;
    if (!mosqueId) {
      toast.error('Mosque not found');
      return;
    }

    const upi = paymentForm.payment_upi.trim();
    const phoneNumber = paymentForm.phone_number.trim();
    const bankAccountName = paymentForm.bank_account_name.trim();
    const bankAccountNumber = paymentForm.bank_account_number.trim();
    const bankIfsc = paymentForm.bank_ifsc.trim().toUpperCase();
    const bankName = paymentForm.bank_name.trim();
    const instructions = paymentForm.payment_instructions.trim();

    if (upi && !/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      toast.error('Invalid UPI ID format');
      return;
    }

    if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      toast.error('Invalid IFSC code');
      return;
    }

    if (bankAccountNumber && !/^\d{8,18}$/.test(bankAccountNumber)) {
      toast.error('Invalid account number');
      return;
    }

    if (!upi && !bankAccountNumber) {
      toast.error('At least one payment method is required');
      return;
    }

    if (phoneNumber && !/^\+?[1-9]\d{9,14}$/.test(phoneNumber)) {
      toast.error('Invalid phone number format');
      return;
    }

    setPaymentSaving(true);
    try {
      const existing = await paymentSettingsService.get();

      await paymentSettingsService.upsert({
        upiId: upi || undefined,
        upiName: (existing?.upiName?.trim() || currentMosque?.name || 'Mosque'),
        phoneNumber: phoneNumber || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccount: bankAccountNumber || undefined,
        ifsc: bankIfsc || undefined,
        bankName: bankName || undefined,
        paymentInstructions: instructions || undefined,
        qrLogo: existing?.qrLogo || undefined,
      });

      toast.success('Payment settings updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update payment settings'));
    } finally {
      setPaymentSaving(false);
    }
  };

  if (isLoading || prayerTimesQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="ds-section">
      <div className="ds-stack">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your mosque settings and preferences</p>
        </div>

        <Tabs defaultValue="general" className="ds-stack">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-transparent p-0">
            <TabsTrigger value="general" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">General</TabsTrigger>
            <TabsTrigger value="prayer" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">Prayer</TabsTrigger>
            <TabsTrigger value="salary" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">Salary</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">Payments</TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">Notifications</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl border border-border bg-background px-4 py-2 text-sm data-[state=active]:border-green-600 data-[state=active]:bg-green-600 data-[state=active]:text-white">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-5">
            <section className="rounded-xl border p-4 space-y-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Mosque Profile</h2>
              </div>

              <form className="space-y-4" onSubmit={handleSubmitGeneralSettings}>
                <div className="space-y-2">
                  <Label htmlFor="mosque-name">Mosque Name</Label>
                  <Input
                    id="mosque-name"
                    className={fieldClass}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="mosque-state">State</Label>
                    <Input
                      id="mosque-state"
                      className={fieldClass}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mosque-city">City</Label>
                    <Input
                      id="mosque-city"
                      className={fieldClass}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mosque-village">Village / Area</Label>
                    <Input
                      id="mosque-village"
                      className={fieldClass}
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mosque-address">Address (Optional)</Label>
                  <Textarea
                    id="mosque-address"
                    className={fieldClass}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className={fieldClass}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    className={fieldClass}
                    placeholder="https://"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    className={fieldClass}
                    placeholder="Tell people about your mosque..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={mosqueProfileMutation.isPending}>
                  {mosqueProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Mosque Changes
                    </>
                  )}
                </Button>
              </form>
            </section>

            <section className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Public Page</h2>
              </div>
              <p className="text-sm text-muted-foreground">Your mosque has a public page at:</p>
              <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm break-all">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/mosque/${currentMosque?.slug || 'your-mosque'}`}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="prayer">
            <Card>
              <CardHeader>
                <CardTitle>Prayer Settings</CardTitle>
                <CardDescription>Set Azan and optional Iqamah times with AM/PM selection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="hidden grid-cols-[1fr_220px_220px] gap-3 px-1 text-sm font-medium text-muted-foreground sm:grid">
                  <p>Prayer</p>
                  <p>Azan</p>
                  <p>Iqamah</p>
                </div>

                {prayerRows.map((row, index) => (
                  <div
                    key={row.prayer}
                    className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_220px_220px] sm:items-center sm:border-0 sm:p-0"
                  >
                    <Label className="font-medium">{row.label}</Label>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{row.isRange ? 'Start' : 'Azan'}</p>
                      <div className="grid grid-cols-[1fr_90px] gap-2">
                        <Input
                          placeholder="hh:mm"
                          value={row.azan.time}
                          onChange={(e) => onPrayerRowChange(index, 'azan', 'time', e.target.value)}
                        />
                        <Select
                          value={row.azan.period}
                          onValueChange={(value: 'AM' | 'PM') => onPrayerRowChange(index, 'azan', 'period', value)}
                        >
                          <SelectTrigger>
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
                        <Input
                          placeholder="hh:mm"
                          value={row.iqamah.time}
                          onChange={(e) => onPrayerRowChange(index, 'iqamah', 'time', e.target.value)}
                        />
                        <Select
                          value={row.iqamah.period}
                          onValueChange={(value: 'AM' | 'PM') => onPrayerRowChange(index, 'iqamah', 'period', value)}
                        >
                          <SelectTrigger>
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

                <Button onClick={handleSavePrayerSettings} disabled={updatePrayerTimesMutation.isPending}>
                  {updatePrayerTimesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Prayer Times
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary" className="space-y-5">
            <section className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <h2 className="text-lg font-semibold text-foreground">Salary Settings</h2>
                </div>
                {hasActiveCycle && nextCycleInfoQuery.data?.hasPendingSettings ? (
                  <Badge variant="secondary">Will apply next month</Badge>
                ) : null}
              </div>

              {hasActiveCycle && nextCycleInfoQuery.data?.nextCycle ? (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Next cycle: {formatCycleLabel(nextCycleInfoQuery.data.nextCycle.month, nextCycleInfoQuery.data.nextCycle.year)}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    Next salary cycle starts in {countdown.days} days {countdown.hours} hours {countdown.minutes} minutes
                  </p>
                </div>
              ) : null}

              {hasActiveCycle ? (
                <div className="space-y-3 rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="salary-next-cycle-current"
                      checked={nextCycleMode === 'use-current'}
                      disabled={settingsLocked}
                      onCheckedChange={(checked) => {
                        if (Boolean(checked)) {
                          setNextCycleMode('use-current');
                        }
                      }}
                    />
                    <Label htmlFor="salary-next-cycle-current" className="text-sm leading-6 cursor-pointer">
                      Use current settings
                    </Label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="salary-next-cycle-update"
                      checked={nextCycleMode === 'update-next'}
                      disabled={settingsLocked}
                      onCheckedChange={(checked) => {
                        if (Boolean(checked)) {
                          setNextCycleMode('update-next');
                        }
                      }}
                    />
                    <Label htmlFor="salary-next-cycle-update" className="text-sm leading-6 cursor-pointer">
                      Update next month settings
                    </Label>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salary-contribution-mode">Contribution Mode</Label>
                  <Select
                    value={salaryForm.contributionMode}
                    disabled={settingsLocked || (hasActiveCycle && nextCycleMode !== 'update-next')}
                    onValueChange={(value: ContributionMode) =>
                      setSalaryForm((prev) => ({ ...prev, contributionMode: value }))
                    }
                  >
                    <SelectTrigger id="salary-contribution-mode" className={fieldClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOUSEHOLD">Per Household</SelectItem>
                      <SelectItem value="PERSON">Per Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary-contribution-amount">Contribution Amount</Label>
                  <Input
                    id="salary-contribution-amount"
                    type="text"
                    inputMode="decimal"
                    pattern="^\d+(?:\.\d{1,2})?$"
                    min={0}
                    step="0.01"
                    className={fieldClass}
                    value={salaryForm.contributionAmount}
                    disabled={settingsLocked || (hasActiveCycle && nextCycleMode !== 'update-next')}
                    onChange={(e) =>
                      setSalaryForm((prev) => ({ ...prev, contributionAmount: e.target.value }))
                    }
                  />
                </div>
              </div>

              {hasActiveCycle && nextCycleMode !== 'update-next' ? (
                <p className="text-xs text-muted-foreground">
                  Current salary configuration will continue for the upcoming cycle.
                </p>
              ) : null}

              {settingsLocked ? (
                <Alert>
                  <AlertTitle>Salary Settings Locked</AlertTitle>
                  <AlertDescription>
                    {settingsLockReason}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">Fixed Contribution Preview</p>
                <p className="text-2xl font-semibold">{formatCurrency(contributionAmountNumber)}</p>
              </div>

              {hasActiveCycle && hasCurrentMonthRateMismatch ? (
                <Alert>
                  <AlertTitle>Current Month Contribution Mismatch Detected</AlertTitle>
                  <AlertDescription>
                    Current cycle is {currentCycleContributionMode} at {formatCurrency(currentCycleContributionAmount)} but settings are {salaryForm.contributionMode} at {formatCurrency(contributionAmountNumber)}. You can apply the new contribution to the current month only if no payments have started.
                  </AlertDescription>
                </Alert>
              ) : null}

              {hasActiveCycle && hasCurrentMonthRateMismatch ? (
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="salary-apply-current-month"
                      checked={applyToCurrentMonth}
                      disabled={settingsLocked || applyToCurrentMonthDisabled}
                      onCheckedChange={(checked) => setApplyToCurrentMonth(Boolean(checked))}
                    />
                    <Label htmlFor="salary-apply-current-month" className="text-sm leading-6 cursor-pointer">
                      Apply to current month (only if no payments started)
                    </Label>
                  </div>

                  {backendReportedPaymentsStarted ? (
                    <p className="text-xs text-destructive">
                      Current month has payments started, so applying to current month is disabled.
                    </p>
                  ) : null}

                  {applyCurrentMonthBlockedReason ? (
                    <p className="text-xs text-destructive">{applyCurrentMonthBlockedReason}</p>
                  ) : null}
                </div>
              ) : null}

              {!hasActiveCycle ? (
                <Button type="button" variant="secondary" onClick={handleStartMonth} disabled={monthSaving || currentMonthExists}>
                  {monthSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Start First Cycle
                </Button>
              ) : null}

              <Button type="button" onClick={handleSaveSalarySettings} disabled={salarySaving || settingsLocked}>
                {salarySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Salary Settings
              </Button>

              <AlertDialog open={isApplyCurrentMonthConfirmOpen} onOpenChange={setIsApplyCurrentMonthConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply salary update to current month?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will recalculate dues for current month for all households
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={salarySaving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={salarySaving}
                      onClick={(event) => {
                        event.preventDefault();
                        void saveSalarySettings(true);
                      }}
                    >
                      {salarySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirm and Apply
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>

            <section className="rounded-xl border p-4 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Salary Month Management</h2>

              <Card>
                <CardHeader>
                  <CardTitle>Current Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {formatCycleLabel(currentPeriod.month, currentPeriod.year)}
                  </p>
                  <Button className="w-full sm:w-auto" onClick={handleStartMonth} disabled={monthSaving || currentMonthExists}>
                    {monthSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                  {monthLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : cycles.length === 0 ? (
                    <ListEmptyState
                      title="No salary months yet"
                      description="Create your first month record from settings."
                      actionLabel="Start Month"
                      onAction={handleStartMonth}
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
            </section>
          </TabsContent>

          <TabsContent value="payments" className="space-y-5">
            <Card className="border-border">
              <CardHeader className="space-y-1">
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Manage donation payment details for this mosque.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-foreground">Pay via UPI</h3>
                  <div className="space-y-2">
                    <Label htmlFor="payment-upi">UPI ID (optional)</Label>
                    <Input
                      id="payment-upi"
                      className={fieldClass}
                      placeholder="example@upi"
                      value={paymentForm.payment_upi}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, payment_upi: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-phone">Phone Number (optional)</Label>
                    <Input
                      id="payment-phone"
                      className={fieldClass}
                      placeholder="+919876543210"
                      value={paymentForm.phone_number}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, phone_number: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-foreground">Pay via Bank Transfer</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="bank-account-name">Account Holder Name</Label>
                      <Input
                        id="bank-account-name"
                        className={fieldClass}
                        value={paymentForm.bank_account_name}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, bank_account_name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-account-number">Account Number</Label>
                      <Input
                        id="bank-account-number"
                        className={fieldClass}
                        value={paymentForm.bank_account_number}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, bank_account_number: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-ifsc">IFSC Code</Label>
                      <Input
                        id="bank-ifsc"
                        className={fieldClass}
                        value={paymentForm.bank_ifsc}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, bank_ifsc: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        className={fieldClass}
                        value={paymentForm.bank_name}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, bank_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-instructions">Payment Instructions (optional)</Label>
                  <Textarea
                    id="payment-instructions"
                    className={fieldClass}
                    rows={4}
                    placeholder="Share any additional payment note for donors"
                    value={paymentForm.payment_instructions}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, payment_instructions: e.target.value }))
                    }
                  />
                </div>

                <Button onClick={handleSavePaymentSettings} disabled={paymentSaving}>
                  {paymentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-foreground">New Donations</Label>
                    <p className="text-sm text-muted-foreground">Get notified when a new donation is recorded</p>
                  </div>
                  <Switch
                    checked={notifications.emailDonations}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailDonations: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-foreground">New Expenses</Label>
                    <p className="text-sm text-muted-foreground">Get notified when a new expense is added</p>
                  </div>
                  <Switch
                    checked={notifications.emailExpenses}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailExpenses: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-foreground">Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of financial activity</p>
                  </div>
                  <Switch
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-foreground">Member Activity</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new members and invitations</p>
                  </div>
                  <Switch
                    checked={notifications.emailMembers}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailMembers: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-border">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-foreground">Email OTP</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a 6-digit login code on email for second-step verification
                    </p>
                  </div>
                  <Switch
                    checked={emailOtpEnabled}
                    onCheckedChange={handleToggleEmailOtp}
                    disabled={securityLoading}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label className="text-foreground">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" onClick={handleSetupTwoFactor} disabled={securityLoading} className="rounded-xl">
                      {securityLoading ? 'Please wait...' : 'Setup 2FA'}
                    </Button>
                  </div>

                  {twoFactorSecret ? (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-sm text-muted-foreground">Save this secret in your authenticator app:</p>
                      <code className="block break-all rounded bg-background px-3 py-2 text-xs">{twoFactorSecret}</code>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          className={fieldClass}
                          placeholder="Enter 6-digit code"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          maxLength={6}
                        />
                        <Button onClick={handleEnableTwoFactor} disabled={securityLoading}>Enable</Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label className="text-foreground">Change Password</Label>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      className={fieldClass}
                      type="password"
                      placeholder="Current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                    />
                    <Input
                      className={fieldClass}
                      type="password"
                      placeholder="New password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                    <Input
                      className={fieldClass}
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleChangePassword} disabled={securityLoading}>
                      Change Password
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Label className="text-foreground">Disable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn off all second-factor methods (Email OTP and Authenticator)
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleDisableTwoFactor} disabled={securityLoading}>
                    Disable 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

