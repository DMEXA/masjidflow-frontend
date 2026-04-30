"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { CalendarDays, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListEmptyState } from "@/components/common/list-empty-state";
import { PageSkeleton } from "@/components/common/loading-skeletons";
import {
  muqtadisService,
  type ContributionMode,
  type ImamSalaryCycle,
  type NextCycleInfo,
} from "@/services/muqtadis.service";
import { useAuthStore } from "@/src/store/auth.store";
import { getErrorMessage } from "@/src/utils/error";
import { formatCurrency, formatCycleLabel } from "@/src/utils/format";
import { parseStrictAmountInput } from "@/src/utils/numeric-input";
import { debugInvalidate } from "@/lib/query-debug";

type SortOrder = "newest" | "oldest";

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
  const hours = Math.floor(
    (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return { days, hours, minutes };
}

export function SalarySettings() {
  const queryClient = useQueryClient();
  const fieldClass = "w-full rounded-xl px-4 py-3";
  const { mosque: currentMosque } = useAuthStore();

  const [nextCycleSaving, setNextCycleSaving] = useState(false);
  const [currentCycleSaving, setCurrentCycleSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [salarySettingsLockedFallback, setSalarySettingsLockedFallback] =
    useState(false);
  const [
    salarySettingsLockReasonFallback,
    setSalarySettingsLockReasonFallback,
  ] = useState<string | null>(null);

  const [nextCycleForm, setNextCycleForm] = useState({
    contributionMode: "HOUSEHOLD" as ContributionMode,
    contributionAmount: "",
  });
  const [nextCycleSnapshot, setNextCycleSnapshot] = useState<{
    contributionMode: ContributionMode;
    contributionAmount: string;
  } | null>(null);
  const [isEditingNextCycle, setIsEditingNextCycle] = useState(false);

  const [currentCycleForm, setCurrentCycleForm] = useState({
    contributionMode: "HOUSEHOLD" as ContributionMode,
    contributionAmount: "",
  });
  const [currentCycleSnapshot, setCurrentCycleSnapshot] = useState<{
    contributionMode: ContributionMode;
    contributionAmount: string;
  } | null>(null);
  const [isEditingCurrentCycle, setIsEditingCurrentCycle] = useState(false);

  const [isCurrentCycleEditConfirmOpen, setIsCurrentCycleEditConfirmOpen] =
    useState(false);
  const [isNextModeConfirmOpen, setIsNextModeConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  const [monthLoading, setMonthLoading] = useState(false);
  const [monthSaving, setMonthSaving] = useState(false);
  const [cycles, setCycles] = useState<ImamSalaryCycle[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const salarySettingsLoadedRef = useRef(false);
  const salaryMonthsLoadedRef = useRef(false);

  const currentPeriod = getCurrentMonthPeriod();

  const nextCycleContributionAmountNumber =
    parseStrictAmountInput(nextCycleForm.contributionAmount) ?? 0;
  const currentCycleContributionAmountNumber =
    parseStrictAmountInput(currentCycleForm.contributionAmount) ?? 0;

  const sortedCycles = useMemo(() => {
    return [...cycles].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? right - left : left - right;
    });
  }, [cycles, sortOrder]);

  useEffect(() => {
    if (salarySettingsLoadedRef.current) {
      return;
    }
    salarySettingsLoadedRef.current = true;

    const loadSalarySettings = async () => {
      setSettingsLoading(true);
      try {
        const settings = await muqtadisService.getSettings();
        setNextCycleForm({
          contributionMode: settings.contributionMode,
          contributionAmount:
            settings.contributionAmount > 0
              ? String(settings.contributionAmount)
              : "",
        });
        setSalarySettingsLockedFallback(Boolean(settings.settingsLocked));
        setSalarySettingsLockReasonFallback(
          settings.settingsLockReason ?? null,
        );
      } catch (error) {
        setNextCycleForm({
          contributionMode: "HOUSEHOLD",
          contributionAmount: "",
        });
        toast.error(getErrorMessage(error, "Failed to load salary settings"));
      } finally {
        setSettingsLoading(false);
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
      toast.error(getErrorMessage(error, "Failed to load salary months"));
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

  const nextCycleInfoQuery = useQuery<NextCycleInfo>({
    queryKey: queryKeys.muqtadiNextCycleInfo,
    queryFn: () => muqtadisService.getNextCycleInfo(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false,
  });

  const summaryQuery = useQuery({
    queryKey: ["salary-summary"],
    queryFn: () => muqtadisService.getSalarySummary(),
    staleTime: 30_000,
  });

  const isCyclePaused = summaryQuery.data?.isCyclePaused ?? false;
  const [pauseLoading, setPauseLoading] = useState(false);
  const isInitialLoading =
    settingsLoading ||
    monthLoading ||
    nextCycleInfoQuery.isLoading ||
    summaryQuery.isLoading;

  const hasCycleFromSummary = summaryQuery.data?.hasCycle ?? false;
  const hasActiveCycle = nextCycleInfoQuery.data?.hasActiveCycle === true;
  // const hasAnyCycle =
  // hasCycleFromSummary || hasActiveCycle || cycles.length > 0;
  // const isFirstTimeSetupMode = !hasCycleFromSummary;
  // const hasConfiguredSettings = nextCycleContributionAmountNumber > 0;

  const controlsDisabled =
    pauseLoading || monthSaving || nextCycleSaving || currentCycleSaving;

  // const hasSavedSettings =
  //   (nextCycleInfoQuery.data?.settings?.contributionAmount ?? 0) > 0;

  // const isFirstTimeSetupMode = !hasActiveCycle;

  // const isReadyToStartFirstCycle = !hasActiveCycle && hasSavedSettings;

  const hasAnyCycle = cycles.length > 0;
  const latestCycle = sortedCycles[0];

  const shouldShowCurrentCycle = Boolean(latestCycle);

  const isFirstTimeSetupMode = !hasActiveCycle && !hasAnyCycle;

  const activeCyclePeriod = nextCycleInfoQuery.data?.currentCycle;
  const activeCycleMonth = activeCyclePeriod?.month ?? null;
  const activeCycleYear = activeCyclePeriod?.year ?? null;
  const activeCycleEntry =
    activeCycleMonth && activeCycleYear
      ? cycles.find(
          (entry) =>
            entry.month === activeCycleMonth && entry.year === activeCycleYear,
        )
      : undefined;

  const currentCycleContributionMode = (activeCycleEntry?.contributionMode ??
    activeCycleEntry?.contributionType ??
    nextCycleInfoQuery.data?.settings.contributionMode ??
    "HOUSEHOLD") as ContributionMode;

  const handleTogglePause = async () => {
    try {
      setPauseLoading(true);

      await muqtadisService.toggleCyclePause({
        isPaused: !isCyclePaused,
      });

      // await summaryQuery.refetch();
      await Promise.all([
        summaryQuery.refetch(),
        nextCycleInfoQuery.refetch(),
        loadSalaryMonths(),
      ]);

      toast.success(isCyclePaused ? "Cycle resumed" : "Cycle paused");
    } catch {
      toast.error("Failed to update cycle state");
    } finally {
      setPauseLoading(false);
    }
  };

  const currentCycleBaseAmount = Number(
    activeCycleEntry?.contributionAmount ??
      activeCycleEntry?.ratePerPerson ??
      activeCycleEntry?.perHead ??
      nextCycleInfoQuery.data?.settings.contributionAmount ??
      0,
  );
  const currentCycleBaseMode = currentCycleContributionMode;

  const hasValidContributionAmount =
    parseStrictAmountInput(nextCycleForm.contributionAmount) !== null &&
    Number(nextCycleForm.contributionAmount) > 0;

  // const cycleControlDisabled =
  //   hasActiveCycle || monthSaving || !hasSavedSettings;
  const cycleControlDisabled = hasActiveCycle || monthSaving;

  const nextCycleChanged = Boolean(
    nextCycleSnapshot &&
    (nextCycleSnapshot.contributionMode !== nextCycleForm.contributionMode ||
      nextCycleSnapshot.contributionAmount !==
        nextCycleForm.contributionAmount),
  );
  const cycleControlReason = hasActiveCycle
    ? "Current cycle is active. You can start a new cycle once it ends."
    : null;

  const currentCycleLocked = Boolean(
    nextCycleInfoQuery.data?.settingsLocked ?? salarySettingsLockedFallback,
  );
  const currentCycleLockReason = currentCycleLocked
    ? "Cannot modify current cycle. Payments have already been recorded."
    : (nextCycleInfoQuery.data?.settingsLockReason ??
      salarySettingsLockReasonFallback ??
      "Settings are locked because payments have already started in this cycle. You can update them for the next cycle.");

  useEffect(() => {
    if (nextCycleInfoQuery.error) {
      toast.error(
        getErrorMessage(
          nextCycleInfoQuery.error,
          "Failed to load next cycle info",
        ),
      );
    }
  }, [nextCycleInfoQuery.error]);

  // useEffect(() => {
  //   const nextCycleInfo = nextCycleInfoQuery.data;
  //   if (!nextCycleInfo || isEditingNextCycle) {
  //     return;
  //   }

  //   const hasPendingNextCycleSettings = nextCycleInfo.hasPendingSettings;
  //   const defaultMode = hasPendingNextCycleSettings
  //     ? nextCycleInfo.settings.contributionMode
  //     : currentCycleBaseMode;
  //   const defaultAmount = hasPendingNextCycleSettings
  //     ? nextCycleInfo.settings.contributionAmount
  //     : currentCycleBaseAmount;

  //   setNextCycleForm({
  //     contributionMode: defaultMode,
  //     contributionAmount: defaultAmount > 0 ? String(defaultAmount) : "",
  //   });
  // }, [
  //   nextCycleInfoQuery.data,
  //   isEditingNextCycle,
  //   currentCycleBaseMode,
  //   currentCycleBaseAmount,
  // ]);
  const currentCycleInitializedRef = useRef(false);

  const nextCycleInitializedRef = useRef(false);

  useEffect(() => {
    if (isEditingNextCycle) {
      return;
    }

    const nextCycleInfo = nextCycleInfoQuery.data;
    if (!nextCycleInfo) {
      return;
    }

    const hasPendingSettings = nextCycleInfo.hasPendingSettings;

    const nextMode = hasPendingSettings
      ? nextCycleInfo.settings.contributionMode
      : currentCycleBaseMode;

    const nextAmount = hasPendingSettings
      ? nextCycleInfo.settings.contributionAmount
      : currentCycleBaseAmount;

    if (
      nextCycleInitializedRef.current &&
      nextCycleForm.contributionMode === nextMode &&
      nextCycleForm.contributionAmount ===
        (nextAmount > 0 ? String(nextAmount) : "")
    ) {
      return;
    }

    nextCycleInitializedRef.current = true;

    setNextCycleForm({
      contributionMode: nextMode,
      contributionAmount: nextAmount > 0 ? String(nextAmount) : "",
    });
  }, [
    nextCycleInfoQuery.data,
    isEditingNextCycle,
    currentCycleBaseMode,
    currentCycleBaseAmount,
    // nextCycleForm.contributionMode,
    // nextCycleForm.contributionAmount,
  ]);
  useEffect(() => {
    if (isEditingCurrentCycle) {
      return;
    }

    if (
      currentCycleInitializedRef.current &&
      currentCycleForm.contributionAmount ===
        (currentCycleBaseAmount > 0 ? String(currentCycleBaseAmount) : "") &&
      currentCycleForm.contributionMode === currentCycleBaseMode
    ) {
      return;
    }

    currentCycleInitializedRef.current = true;

    setCurrentCycleForm({
      contributionMode: currentCycleBaseMode,
      contributionAmount:
        currentCycleBaseAmount > 0 ? String(currentCycleBaseAmount) : "",
    });
  }, [currentCycleBaseMode, currentCycleBaseAmount, isEditingCurrentCycle]);

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

  if (isInitialLoading) {
    return <PageSkeleton rows={2} cardCount={4} />;
  }

  const saveNextCycleSettings = async () => {
    // if (currentCycleLocked) {
    //   toast.error(
    //     "Cannot change settings after payments have started. Changes will apply to next cycle.",
    //   );
    //   return;
    // }

    const contributionAmountValue = parseStrictAmountInput(
      nextCycleForm.contributionAmount,
    );

    if (contributionAmountValue === null || contributionAmountValue <= 0) {
      toast.error("Contribution amount must be greater than 0");
      return;
    }

    setNextCycleSaving(true);
    try {
      await muqtadisService.updateSettings({
        contributionMode: nextCycleForm.contributionMode,
        contributionAmount: contributionAmountValue,
        imamSalarySystem: "EQUAL",
        totalSalary: contributionAmountValue,
        applyToCurrentMonth: false,
        isNextMonth: hasActiveCycle,
        useCurrentSettingsForNextCycle: false,
      });
      // await loadSalaryMonths();
      setNextCycleForm({
        contributionMode: nextCycleForm.contributionMode,
        contributionAmount: String(contributionAmountValue),
      });
      await Promise.all([
        debugInvalidate(queryClient, queryKeys.muqtadiNextCycleInfo, {
          exact: true,
        }),
        debugInvalidate(
          queryClient,
          queryKeys.imamSalaryCycles(currentMosque?.id),
          { exact: false },
        ),
      ]);
      toast.success(
        hasActiveCycle ? "Next cycle settings saved" : "Settings saved",
      );
      setNextCycleSnapshot({
        contributionMode: nextCycleForm.contributionMode,
        contributionAmount: String(contributionAmountValue),
      });
      setIsEditingNextCycle(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update salary settings"));
    } finally {
      setNextCycleSaving(false);
    }
  };

  const saveCurrentCycleSettings = async () => {
    if (!hasActiveCycle) {
      toast.error("No active cycle available to edit");
      return;
    }

    if (currentCycleLocked) {
      toast.error("Cannot modify current cycle. Payments have been recorded.");
      return;
    }

    const contributionAmountValue = parseStrictAmountInput(
      currentCycleForm.contributionAmount,
    );
    if (contributionAmountValue === null || contributionAmountValue <= 0) {
      toast.error("Contribution amount must be greater than 0");
      return;
    }

    setCurrentCycleSaving(true);
    try {
      await muqtadisService.updateSettings({
        contributionMode: currentCycleForm.contributionMode,
        contributionAmount: contributionAmountValue,
        imamSalarySystem: "EQUAL",
        totalSalary: contributionAmountValue,
        applyToCurrentMonth: true,
        isNextMonth: false,
        useCurrentSettingsForNextCycle: false,
      });
      await loadSalaryMonths();
      await Promise.all([
        debugInvalidate(queryClient, queryKeys.muqtadis(), { exact: false }),
        debugInvalidate(
          queryClient,
          queryKeys.dashboardOverview(currentMosque?.id),
          { exact: false },
        ),
        debugInvalidate(queryClient, queryKeys.muqtadiDuesRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiDetailRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiPaymentsRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiHistoryRoot, {
          exact: false,
        }),
        debugInvalidate(
          queryClient,
          queryKeys.imamSalaryCycles(currentMosque?.id),
          { exact: false },
        ),
        debugInvalidate(queryClient, queryKeys.muqtadiStats, { exact: false }),
        debugInvalidate(queryClient, queryKeys.muqtadiSalarySummary, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiNextCycleInfo, {
          exact: true,
        }),
      ]);
      toast.success("Current cycle updated");
      setIsEditingCurrentCycle(false);
      setCurrentCycleForm({
        contributionMode: currentCycleForm.contributionMode,
        contributionAmount: String(contributionAmountValue),
      });

      setCurrentCycleSnapshot({
        contributionMode: currentCycleForm.contributionMode,
        contributionAmount: String(contributionAmountValue),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update current cycle"));
    } finally {
      setCurrentCycleSaving(false);
    }
  };

  const handleStartEditingNextCycle = () => {
    setNextCycleSnapshot({ ...nextCycleForm });
    setIsEditingNextCycle(true);
  };

  const handleCancelEditingNextCycle = () => {
    if (nextCycleSnapshot) {
      setNextCycleForm(nextCycleSnapshot);
    }
    setIsEditingNextCycle(false);
  };

  const handleRequestEditCurrentCycle = () => {
    setIsCurrentCycleEditConfirmOpen(true);
  };

  const handleConfirmEditCurrentCycle = () => {
    setCurrentCycleSnapshot({ ...currentCycleForm });
    setIsEditingCurrentCycle(true);
    setIsCurrentCycleEditConfirmOpen(false);
  };

  const handleCancelEditingCurrentCycle = () => {
    if (currentCycleSnapshot) {
      setCurrentCycleForm(currentCycleSnapshot);
    }
    setIsEditingCurrentCycle(false);
  };

  const handleSaveNextCycle = async () => {
    if (!isEditingNextCycle) {
      return;
    }

    const modeChanged = Boolean(
      nextCycleSnapshot &&
      nextCycleSnapshot.contributionMode !== nextCycleForm.contributionMode,
    );
    if (modeChanged) {
      setIsNextModeConfirmOpen(true);
      return;
    }

    await saveNextCycleSettings();
  };

  const handleConfirmNextModeChange = async () => {
    setIsNextModeConfirmOpen(false);
    await saveNextCycleSettings();
  };

  const handleSaveFirstTimeSettings = async () => {
    await saveNextCycleSettings();
  };

  const handleStartMonth = async () => {
    if (hasActiveCycle) {
      return;
    }

    const contributionAmountValue = parseStrictAmountInput(
      nextCycleForm.contributionAmount,
    );

    if (contributionAmountValue === null || contributionAmountValue <= 0) {
      toast.error("Contribution amount must be greater than 0");
      return;
    }

    setMonthSaving(true);
    try {
      const created = await muqtadisService.createSalaryMonth({
        month: currentPeriod.month,
        year: currentPeriod.year,
      });
      toast.success(
        `Month created with ${formatCurrency(created.contributionAmount ?? created.perHead)} fixed contribution`,
      );
      await loadSalaryMonths();
      await Promise.all([
        debugInvalidate(queryClient, queryKeys.muqtadis(), { exact: false }),
        debugInvalidate(
          queryClient,
          queryKeys.dashboardOverview(currentMosque?.id),
          { exact: false },
        ),
        debugInvalidate(queryClient, queryKeys.muqtadiDuesRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiDetailRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiPaymentsRoot, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiHistoryRoot, {
          exact: false,
        }),
        debugInvalidate(
          queryClient,
          queryKeys.imamSalaryCycles(currentMosque?.id),
          { exact: false },
        ),
        debugInvalidate(queryClient, queryKeys.muqtadiStats, { exact: false }),
        debugInvalidate(queryClient, queryKeys.muqtadiSalarySummary, {
          exact: false,
        }),
        debugInvalidate(queryClient, queryKeys.muqtadiNextCycleInfo, {
          exact: true,
        }),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create salary month"));
    } finally {
      setMonthSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isFirstTimeSetupMode ? (
        <Card className="border-border">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle className="text-lg">
                  Setup First Salary Cycle
                </CardTitle>
              </div>
              <Badge variant="secondary">Setup</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure contribution settings, then create the first cycle.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-cycle-mode">Contribution Mode</Label>
                <Select
                  value={nextCycleForm.contributionMode}
                  onValueChange={(value: ContributionMode) =>
                    setNextCycleForm((prev) => ({
                      ...prev,
                      contributionMode: value,
                    }))
                  }
                >
                  <SelectTrigger id="first-cycle-mode" className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOUSEHOLD">Per Household</SelectItem>
                    <SelectItem value="PERSON">Per Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="first-cycle-amount">Contribution Amount</Label>
                <Input
                  id="first-cycle-amount"
                  type="text"
                  inputMode="decimal"
                  pattern="^\d+(?:\.\d{1,2})?$"
                  min={0}
                  step="0.01"
                  className={fieldClass}
                  value={nextCycleForm.contributionAmount}
                  onChange={(e) =>
                    setNextCycleForm((prev) => ({
                      ...prev,
                      contributionAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSaveFirstTimeSettings()}
                // disabled={nextCycleSaving || monthSaving}
                disabled={controlsDisabled || !hasValidContributionAmount}
              >
                {nextCycleSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save & Start Cycle
              </Button>
              {/* <Button
                type="button"
                onClick={() => void handleStartMonth()}
                // disabled={monthSaving}
                disabled={controlsDisabled || !hasValidContributionAmount}
              >
                {monthSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Start First Cycle
              </Button> */}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {shouldShowCurrentCycle ? (
            <Card className="border-border">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <CardTitle className="text-lg">Current Cycle</CardTitle>
                  </div>
                  {/* <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </Badge> */}

                  <Badge
                    className={
                      isCyclePaused
                        ? "border border-amber-200 bg-amber-100 text-amber-800"
                        : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                    }
                  >
                    {isCyclePaused ? "Paused" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Status and editable contribution for the active cycle.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Mode
                    </p>
                    <p className="mt-1 font-medium">
                      {currentCycleForm.contributionMode === "HOUSEHOLD"
                        ? "Per Household"
                        : "Per Person"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Amount
                    </p>
                    <p className="mt-1 font-medium">
                      {formatCurrency(currentCycleContributionAmountNumber)}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    {/* <p className="mt-1 font-medium">
                      {/* {hasActiveCycle ? "Active" : "No Active Cycle"} */}
                    Active
                    {/* </p> */} */
                    <p className="mt-1 font-medium">
                      {isCyclePaused ? "Paused" : "Active"}
                    </p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Payment Status
                    </p>
                    <p className="mt-1 font-medium">
                      {currentCycleLocked
                        ? "Payments Recorded"
                        : "No Payments Recorded"}
                    </p>
                  </div>
                </div>

                {currentCycleLocked ? (
                  <Alert className="border-amber-200 bg-amber-50/60">
                    <AlertTitle>Current Cycle Locked</AlertTitle>
                    <AlertDescription>
                      Cannot modify current cycle. Payments have been recorded.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isEditingCurrentCycle ? (
                  <div className="space-y-4 rounded-xl border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="current-cycle-mode">
                          Contribution Mode
                        </Label>
                        <Select
                          value={currentCycleForm.contributionMode}
                          onValueChange={(value: ContributionMode) =>
                            setCurrentCycleForm((prev) => ({
                              ...prev,
                              contributionMode: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            id="current-cycle-mode"
                            className={fieldClass}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOUSEHOLD">
                              Per Household
                            </SelectItem>
                            <SelectItem value="PERSON">Per Person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="current-cycle-amount">
                          Contribution Amount
                        </Label>
                        <Input
                          id="current-cycle-amount"
                          type="text"
                          inputMode="decimal"
                          pattern="^\d+(?:\.\d{1,2})?$"
                          min={0}
                          step="0.01"
                          className={fieldClass}
                          value={currentCycleForm.contributionAmount}
                          onChange={(e) =>
                            setCurrentCycleForm((prev) => ({
                              ...prev,
                              contributionAmount: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEditingCurrentCycle}
                        disabled={controlsDisabled}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void saveCurrentCycleSettings()}
                        disabled={controlsDisabled || currentCycleLocked}
                      >
                        {currentCycleSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}

                {!isEditingCurrentCycle && shouldShowCurrentCycle ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestEditCurrentCycle}
                      // disabled={currentCycleLocked}
                      disabled={controlsDisabled || currentCycleLocked}
                      title={currentCycleLocked ? currentCycleLockReason : ""}
                      className="disabled:opacity-60"
                    >
                      Edit Current Cycle
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {/* <CardTitle className="text-lg">Next Cycle Settings</CardTitle> */}
                  {/* <CardTitle className="text-lg">
                    {/* {hasActiveCycle ? "Next Cycle Settings" : "Default Cycle Settings"} */}
                  Next Cycle Settings
                  {/* </CardTitle> */} */
                  <CardTitle className="text-lg">
                    {hasActiveCycle
                      ? "Next Cycle Settings"
                      : "Default Cycle Settings"}
                  </CardTitle>
                </div>
                {/* <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                  Upcoming
                </Badge> */}
                <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                  {hasActiveCycle ? "Upcoming" : "Default"}
                </Badge>
              </div>
              {/* <p className="text-sm text-muted-foreground">
                Default matches current cycle. Save only affects next cycle.
              </p> */}
              <p className="text-sm text-muted-foreground">
                {hasActiveCycle
                  ? "Changes here apply to the next cycle only."
                  : "These settings will be used when the first cycle starts."}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingNextCycle ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Mode
                      </p>
                      <p className="mt-1 font-medium">
                        {nextCycleForm.contributionMode === "HOUSEHOLD"
                          ? "Per Household"
                          : "Per Person"}
                      </p>
                    </div>
                    <div className="rounded-xl border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Amount
                      </p>
                      <p className="mt-1 font-medium">
                        {formatCurrency(nextCycleContributionAmountNumber)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleStartEditingNextCycle}
                      disabled={controlsDisabled}
                      className="disabled:opacity-60"
                    >
                      Edit
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="next-cycle-mode">Contribution Mode</Label>
                      <Select
                        value={nextCycleForm.contributionMode}
                        onValueChange={(value: ContributionMode) =>
                          setNextCycleForm((prev) => ({
                            ...prev,
                            contributionMode: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="next-cycle-mode"
                          className={fieldClass}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOUSEHOLD">
                            Per Household
                          </SelectItem>
                          <SelectItem value="PERSON">Per Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="next-cycle-amount">
                        Contribution Amount
                      </Label>
                      <Input
                        id="next-cycle-amount"
                        type="text"
                        inputMode="decimal"
                        pattern="^\d+(?:\.\d{1,2})?$"
                        min={0}
                        step="0.01"
                        className={fieldClass}
                        value={nextCycleForm.contributionAmount}
                        onChange={(e) =>
                          setNextCycleForm((prev) => ({
                            ...prev,
                            contributionAmount: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEditingNextCycle}
                      disabled={controlsDisabled}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSaveNextCycle()}
                      // disabled={nextCycleSaving}
                      disabled={controlsDisabled || !nextCycleChanged}
                    >
                      {nextCycleSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  <CardTitle className="text-lg">Cycle Control</CardTitle>
                </div>
                <Badge variant="secondary">Control</Badge>
              </div>
              {/* <p className="text-sm text-muted-foreground">
                Create a new month from saved settings when the active cycle
                ends.
              </p> */}
              <p className="text-sm text-muted-foreground">
                {hasActiveCycle
                  ? "Create the next cycle after the current cycle ends."
                  : "No active cycle currently exists."}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Cycle Status
                </p>

                <p
                  className={`mt-1 font-medium ${isCyclePaused ? "text-red-600" : "text-green-600"}`}
                >
                  {isCyclePaused ? "Paused" : "Active"}
                </p>

                {isCyclePaused && (
                  <p className="text-xs text-red-500 mt-1">
                    Payments and new cycles are disabled.
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Current Month
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {formatCycleLabel(currentPeriod.month, currentPeriod.year)}
                  </p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Countdown to next cycle
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {hasActiveCycle
                      ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
                      : "Not active"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {hasActiveCycle
                    ? "Current cycle must end before starting another cycle."
                    : "No active cycle currently exists."}
                </p>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleTogglePause()}
                    disabled={controlsDisabled}
                  >
                    {pauseLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isCyclePaused ? "Resume Cycle" : "Pause Cycle"}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => void handleStartMonth()}
                    // disabled={cycleControlDisabled || isCyclePaused}
                    disabled={
                      controlsDisabled || cycleControlDisabled || isCyclePaused
                    }
                    className="disabled:opacity-60 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {monthSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Start New Month
                    {/* {hasActiveCycle ? "Start New Month" : "Start First Cycle"} */}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  <CardTitle className="text-lg">History</CardTitle>
                </div>
                <Badge variant="outline">Records</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Review previous salary cycles and contribution snapshots.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <select
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm sm:w-40"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              {monthLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : cycles.length === 0 ? (
                <ListEmptyState
                  title="No salary history yet"
                  description="Create a cycle to view history."
                  // actionLabel="Start New Month"
                  actionLabel="Save & Start Cycle"
                  // onAction={() => void handleStartMonth()}
                  onAction={() => {
                    void handleSaveFirstTimeSettings();
                  }}
                  // disabled={!hasValidContributionAmount} getting error in this change
                  className="min-h-40"
                />
              ) : (
                <div className="space-y-2">
                  {sortedCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="rounded-xl border p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {formatCycleLabel(cycle.month, cycle.year)}
                          </p>
                          <p className="text-muted-foreground">
                            Mode:{" "}
                            {cycle.contributionMode ??
                              cycle.contributionType ??
                              "HOUSEHOLD"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(
                              cycle.contributionAmount ?? cycle.perHead,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(cycle.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog
        open={isCurrentCycleEditConfirmOpen}
        onOpenChange={setIsCurrentCycleEditConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              You are modifying an active cycle.
            </AlertDialogTitle>
            <AlertDialogDescription>
              This may affect ongoing records. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEditCurrentCycle}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isNextModeConfirmOpen}
        onOpenChange={setIsNextModeConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              This will change how contributions are calculated.
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will apply to all households. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmNextModeChange()}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
