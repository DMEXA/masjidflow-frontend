import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListEmptyState } from "@/components/common/list-empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/query-keys";
import { muqtadisService } from "@/services/muqtadis.service";

export default function MuqtadiDetailsModal({
  open,
  onOpenChange,
  details,
  selectedMuqtadi,
  onDetailsChange,
  formatDate,
  formatCurrency,
  formatCycleLabel,
  getCycleStatus,
  onOpenRecordPayment,
  onOpenEditDetails,
  onUpdatePreviousDue,
  onVerifyPending,
  onRejectPending,
  onOpenCreateCycle,
  onOpenPaymentDetail,
  onAddDependent,
  onRemoveDependent,
  onIncludeInCycle,
  onRemoveFromCycle,
  onGenerateLoginLink,
  onSendResetLink,
  onCopyAuthLink,
  isUpdatingDependents,
  isIncludingInCycle,
  isRemovingFromCycle,
  isGeneratingLoginLink,
  isSendingResetLink,
  isPendingActionLoading,
  authLinkState,
}) {
  const [dependentName, setDependentName] = useState("");
  const [isEditingPreviousDue, setIsEditingPreviousDue] = useState(false);
  const [pendingPreviousDue, setPendingPreviousDue] = useState("");
  const [isSavingPreviousDue, setIsSavingPreviousDue] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const muqtadiId = selectedMuqtadi?.id;

  const detailQuery = useQuery({
    queryKey: queryKeys.muqtadiDetail(muqtadiId),
    queryFn: () => muqtadisService.getById(muqtadiId),
    enabled: Boolean(open && muqtadiId),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const detail = useMemo(() => {
    if (detailQuery.data?.id === muqtadiId) {
      return detailQuery.data;
    }

    if (details?.id === muqtadiId) {
      return details;
    }

    return null;
  }, [detailQuery.data, details, muqtadiId]);

  const overview = detail?.overview ?? {};
  const totalPaid = Number(overview.totalPaid || 0);
  const previousDuePendingAmount = Number(
    overview.previousDuePending ?? detail?.previousDue ?? 0,
  );
  const previousDuePaidAmount = Number(
    overview.previousDuePaid ?? detail?.historicalPreviousDue ?? 0,
  );
  const historicalPreviousDueAmount = Number(
    overview.historicalPreviousDue ?? detail?.historicalPreviousDue ?? 0,
  );
  const previousDuePaidDisplayAmount =
    previousDuePaidAmount > 0
      ? previousDuePaidAmount
      : historicalPreviousDueAmount;
  const previousDueAmount =
    previousDuePendingAmount > 0
      ? previousDuePendingAmount
      : previousDuePaidDisplayAmount;
  const previousDueEditLocked = totalPaid > 0;
  const removeBlockedByPayment = Boolean(detail?.hasCycle) && totalPaid > 0;
  const isInitialLoading = Boolean(open && muqtadiId && !detail);
  const payments = useMemo(() => detail?.payments ?? [], [detail?.payments]);
  const history = useMemo(() => detail?.history ?? [], [detail?.history]);
  const dues = useMemo(() => {
    const cycleDues = detail?.dues ?? [];
    const previousDueCard =
      previousDueAmount > 0
        ? [
            {
              id: "previous-due",
              isPreviousDue: true,
              status: previousDuePendingAmount > 0 ? "PENDING" : "PAID",
              expectedAmount: previousDueAmount,
              paidAmount: previousDuePendingAmount > 0 ? 0 : previousDueAmount,
              remainingAmount: previousDuePendingAmount > 0 ? previousDueAmount : 0,
            },
          ]
        : [];

    return [...previousDueCard, ...cycleDues];
  }, [detail, previousDueAmount, previousDuePendingAmount]);

  const accountState = detail?.accountState || "OFFLINE";
  const isPendingHousehold = detail?.isVerified === false;
  const hasCycle = detail?.hasCycle === true;
  const hasAnyCycleData = Array.isArray(detail?.dues);
  const safeHasCycle = hasCycle || hasAnyCycleData;
  const isHouseholdInCycle = detail?.isHouseholdInCycle === true;
  const pendingExpiryMinutes =
    authLinkState?.expiresInMinutes ??
    detail?.setupLinkExpiresInMinutes ??
    null;
  const activeLink = authLinkState?.link ?? "";

  useEffect(() => {
    if (!open) {
      setDependentName("");
      setActiveTab("overview");
      setIsEditingPreviousDue(false);
      setPendingPreviousDue("");
    }
  }, [open]);

  useEffect(() => {
    setDependentName("");
    setActiveTab("overview");
    setIsEditingPreviousDue(false);
    setPendingPreviousDue("");
  }, [muqtadiId]);

  useEffect(() => {
    if (!detail) return;
    setPendingPreviousDue(String(previousDuePendingAmount ?? 0));
  }, [detail, previousDuePendingAmount]);

  useEffect(() => {
    if (detailQuery.data && onDetailsChange) {
      onDetailsChange(detailQuery.data);
    }
  }, [detailQuery.data, onDetailsChange]);

  const memberNames = useMemo(() => {
    const apiNames = detail?.memberNames;
    if (Array.isArray(apiNames) && apiNames.length > 0) {
      return apiNames.filter((name) => Boolean(String(name || "").trim()));
    }
    return [];
  }, [detail?.memberNames]);

  if (!open) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>
            {detail?.name ||
              selectedMuqtadi?.name ||
              (isInitialLoading ? "Loading..." : "Household Details")}
          </SheetTitle>
          <SheetDescription>
            {isInitialLoading
              ? "Fetching details..."
              : "Overview, dues, payments, and full admin controls"}
          </SheetDescription>
        </SheetHeader>

        {!isInitialLoading && isPendingHousehold ? (
          <div className="flex w-full flex-col gap-3 px-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <div className="space-y-2 sm:min-w-52">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Previous Due (₹)
              </p>
              <Input
                type="text"
                inputMode="decimal"
                pattern="^\d+(?:\.\d{1,2})?$"
                value={pendingPreviousDue}
                onChange={(event) => setPendingPreviousDue(event.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-w-26 rounded-xl"
              onClick={onOpenEditDetails}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-w-26 rounded-xl"
              onClick={() => onVerifyPending?.(pendingPreviousDue)}
              disabled={isPendingActionLoading}
            >
              {isPendingActionLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Verify
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="min-w-26 rounded-xl"
              onClick={onRejectPending}
              disabled={isPendingActionLoading}
            >
              {isPendingActionLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Reject
            </Button>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dues">Dues</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {isInitialLoading ? (
              <>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      {detail?.name || selectedMuqtadi?.name || "-"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {detail?.phone ||
                        detail?.whatsappNumber ||
                        selectedMuqtadi?.phone ||
                        selectedMuqtadi?.whatsappNumber ||
                        "-"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      {accountState === "ACTIVE"
                        ? "Online"
                        : accountState === "PENDING_SETUP"
                          ? "Pending Setup"
                          : "Offline"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Members:</span>{" "}
                      {detail?.householdMembers ?? "-"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Credit Balance:
                      </span>{" "}
                      {formatCurrency(detail?.creditBalance ?? 0)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Outstanding Balance:
                      </span>{" "}
                      {formatCurrency(detail?.overview?.outstandingAmount ?? 0)}
                    </p>

                    {!isPendingHousehold && previousDuePendingAmount > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p>
                            <span className="text-muted-foreground">
                              Previous Pending:
                            </span>{" "}
                            <span className="font-medium">
                              {formatCurrency(previousDueAmount)}
                            </span>
                          </p>
                          {!previousDueEditLocked ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setPendingPreviousDue(String(previousDueAmount));
                                setIsEditingPreviousDue(true);
                              }}
                            >
                              ✏️
                            </Button>
                          ) : null}
                        </div>

                        {isEditingPreviousDue ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              pattern="^\d+(?:\.\d{1,2})?$"
                              value={pendingPreviousDue}
                              onChange={(event) =>
                                setPendingPreviousDue(event.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSavingPreviousDue}
                              onClick={async () => {
                                try {
                                  setIsSavingPreviousDue(true);
                                  const normalizedValue = Number(
                                    Number(pendingPreviousDue || 0).toFixed(2),
                                  );
                                  await onUpdatePreviousDue?.(normalizedValue);
                                  setIsEditingPreviousDue(false);
                                } finally {
                                  setIsSavingPreviousDue(false);
                                }
                              }}
                            >
                              {isSavingPreviousDue ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : !isPendingHousehold && previousDuePaidDisplayAmount > 0 ? (
                      <p>
                        <span className="text-muted-foreground">
                          Previous Paid:
                        </span>{" "}
                        <span className="font-medium">
                          {formatCurrency(previousDuePaidDisplayAmount)}
                        </span>
                      </p>
                    ) : null}

                    <p>
                      <span className="text-muted-foreground">Join Date:</span>{" "}
                      {selectedMuqtadi?.createdAt
                        ? formatDate(selectedMuqtadi.createdAt)
                        : "-"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">Dependents</p>
                      <div className="flex w-full max-w-xs items-center gap-2">
                        <Input
                          value={dependentName}
                          onChange={(event) => setDependentName(event.target.value)}
                          placeholder="Add dependent"
                          disabled={isUpdatingDependents}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (!dependentName.trim()) return;
                            onAddDependent(dependentName.trim());
                            setDependentName("");
                          }}
                          disabled={isUpdatingDependents || !dependentName.trim()}
                        >
                          {isUpdatingDependents ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-3.5 w-3.5" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>

                    {memberNames.length === 0 ? (
                      <p className="text-muted-foreground">
                        No household members found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {memberNames.map((name, index) => (
                          <div
                            key={`${detail?.id || selectedMuqtadi?.id || "muqtadi"}-member-${index}`}
                            className="flex items-center justify-between rounded-md border px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <p>{name}</p>
                              <Badge variant="secondary">
                                {index === 0 ? "Head" : "Dependent"}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveDependent(index)}
                              disabled={
                                isUpdatingDependents || memberNames.length <= 1
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 pt-4 text-sm">
                    <p className="font-medium">Admin Actions</p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cycle Control
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isIncludingInCycle || isHouseholdInCycle}
                          onClick={onIncludeInCycle}
                        >
                          Add to Cycle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            isRemovingFromCycle ||
                            !safeHasCycle ||
                            !isHouseholdInCycle ||
                            removeBlockedByPayment
                          }
                          onClick={onRemoveFromCycle}
                        >
                          Remove from Cycle
                        </Button>
                      </div>
                      {!safeHasCycle ? (
                        <p className="text-xs text-muted-foreground">
                          No active cycle found.
                        </p>
                      ) : !isHouseholdInCycle ? (
                        <p className="text-xs text-muted-foreground">
                          Household not in current cycle.
                        </p>
                      ) : null}
                      {removeBlockedByPayment ? (
                        <p className="text-xs text-muted-foreground">
                          Cannot remove from cycle because a payment exists in the
                          current cycle.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Account Access
                      </p>
                      {accountState === "OFFLINE" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isGeneratingLoginLink}
                            onClick={onGenerateLoginLink}
                          >
                            {isGeneratingLoginLink ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Generate Login Link
                          </Button>
                        </div>
                      ) : null}

                      {accountState === "PENDING_SETUP" ? (
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Setup in progress
                            {typeof pendingExpiryMinutes === "number"
                              ? ` • Expires in ${pendingExpiryMinutes} min`
                              : ""}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={onCopyAuthLink}
                              disabled={!activeLink}
                            >
                              Copy Link
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isGeneratingLoginLink}
                              onClick={onGenerateLoginLink}
                            >
                              {isGeneratingLoginLink ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Regenerate Link
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {accountState === "ACTIVE" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isSendingResetLink}
                            onClick={onSendResetLink}
                          >
                            {isSendingResetLink ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Reset Password
                          </Button>
                        </div>
                      ) : null}

                      {activeLink ? (
                        <Input readOnly value={activeLink} className="max-w-sm" />
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Edit
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onOpenEditDetails}
                      >
                        Edit Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="dues" className="space-y-3">
            {isInitialLoading ? (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            ) : !safeHasCycle ? (
              <ListEmptyState
                title="No cycle exists"
                description="Create a cycle to generate dues"
                actionLabel="Create Cycle"
                onAction={onOpenCreateCycle}
                className="min-h-36"
              />
            ) : !isHouseholdInCycle ? (
              <ListEmptyState
                title="Household not included in current cycle"
                description="Add this household to generate dues"
                actionLabel="Add to Cycle"
                onAction={onIncludeInCycle}
                className="min-h-36"
              />
            ) : dues.length === 0 ? (
              <ListEmptyState
                title="No dues available"
                description="No dues yet"
                className="min-h-36"
              />
            ) : (
              <div className="space-y-3">
                {dues.map((due) => {
                  const isPreviousDueCard = due.isPreviousDue === true;
                  const expectedAmount = Math.max(
                    Number(due.expectedAmount ?? due.grossExpectedAmount ?? 0),
                    0,
                  );
                  const paidAmount = Math.max(Number(due.paidAmount ?? 0), 0);
                  const remainingAmount = Math.max(
                    Number(due.remainingAmount ?? 0),
                    0,
                  );
                  const creditApplied = Math.max(
                    Number(due.creditApplied ?? 0),
                    0,
                  );

                  return (
                    <Card key={due.id}>
                      <CardContent className="space-y-2 pt-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {isPreviousDueCard
                              ? "Previous Balance"
                              : formatCycleLabel(due.month, due.year)}
                          </p>
                          <Badge
                            variant={
                              due.status === "PAID" ? "default" : "secondary"
                            }
                          >
                            {due.status}
                          </Badge>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2">
                          <p>
                            <span className="text-muted-foreground">
                              Total:
                            </span>{" "}
                            {formatCurrency(expectedAmount)}
                          </p>
                          {creditApplied > 0 ? (
                            <p className="text-emerald-600">
                              Credit Used: {formatCurrency(creditApplied)}
                            </p>
                          ) : (
                            <p />
                          )}
                          <p>Cash Paid: {formatCurrency(paidAmount)}</p>
                          <p>
                            <span className="text-muted-foreground">Cycle:</span>{" "}
                            {isPreviousDueCard
                              ? "Historical"
                              : getCycleStatus(due.month, due.year)}
                          </p>
                          <p
                            className={
                              remainingAmount > 0
                                ? "text-red-600"
                                : "text-emerald-700"
                            }
                          >
                            <span className="text-muted-foreground">
                              Remaining:
                            </span>{" "}
                            {formatCurrency(remainingAmount)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {Number(detail?.creditBalance ?? detail?.overview?.credit ?? 0) > 0 ? (
                  <Card>
                    <CardContent className="pt-4 text-sm">
                      <p>
                        <span className="text-muted-foreground">
                          Available Credit:
                        </span>{" "}
                        {formatCurrency(
                          detail?.overview?.credit ?? detail?.creditBalance ?? 0,
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3">
            {isInitialLoading ? (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div className="text-sm space-y-1">
                      <p>
                        Total Due: {formatCurrency(detail?.overview?.totalDue ?? 0)}
                      </p>
                      <p>
                        Total Paid: {formatCurrency(detail?.overview?.totalPaid ?? 0)}
                      </p>
                      <p>
                        Credit: {formatCurrency(detail?.overview?.credit ?? detail?.creditBalance ?? 0)}
                      </p>
                      <p className="font-semibold">
                        Outstanding: {formatCurrency(detail?.overview?.outstandingAmount ?? 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {!safeHasCycle ? (
                  <ListEmptyState
                    title="No payment cycle available"
                    description="Create a cycle before recording payments."
                    actionLabel="Create Cycle"
                    onAction={onOpenCreateCycle}
                    className="min-h-36"
                  />
                ) : !isHouseholdInCycle ? (
                  <ListEmptyState
                    title="Household not part of cycle"
                    description="Add this household to current cycle to record payments."
                    actionLabel="Add to Cycle"
                    onAction={onIncludeInCycle}
                    className="min-h-36"
                  />
                ) : payments.length === 0 ? (
                  <ListEmptyState
                    title="No payment records yet"
                    description="Record the first payment to start this history."
                    actionLabel="Record Payment"
                    onAction={onOpenRecordPayment}
                    className="min-h-36"
                  />
                ) : (
                  <div className="space-y-3">
                    {payments.map((entry) => {
                      const paymentStatus = String(
                        entry.details?.status || "PENDING",
                      ).toLowerCase();
                      const paymentAmount = Number(
                        entry.details?.totalAmount ?? entry.details?.amount ?? 0,
                      );
                      const allocations = Array.isArray(entry.details?.allocations)
                        ? entry.details.allocations
                        : [];

                      return (
                        <Card key={`${entry.action}-${entry.id}`}>
                          <CardContent className="space-y-2 pt-4 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">
                                {formatDate(entry.createdAt, "MMM dd, yyyy hh:mm a")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                By: {entry.details?.createdByName || "System"}
                              </p>
                              <Badge
                                variant={
                                  paymentStatus === "verified"
                                    ? "default"
                                    : paymentStatus === "pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {paymentStatus.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  Payment Amount: {formatCurrency(paymentAmount)}
                                </p>
                                {entry.details?.cycle && entry.details?.cycle?.year ? (
                                  <p className="text-xs text-muted-foreground">
                                    Cycle: {formatCycleLabel(
                                      entry.details.cycle.month,
                                      entry.details.cycle.year,
                                    )}
                                  </p>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {entry.details?.method || "—"} • {entry.details?.type || "—"}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenPaymentDetail(entry.id)}
                              >
                                View Payment
                              </Button>
                            </div>
                            {allocations.length > 0 ? (
                              <div className="space-y-1 rounded-md border p-2">
                                {allocations.map((allocation, index) => (
                                  <div
                                    key={`${entry.id}-allocation-${index}`}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-muted-foreground">
                                      {allocation?.allocationType === "OVERFLOW_CREDIT"
                                        ? "Overflow Credit"
                                        : allocation?.cycleId
                                          ? formatCycleLabel(
                                              allocation?.month,
                                              allocation?.year,
                                            )
                                          : "Previous Due"}
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(Number(allocation?.amount ?? 0))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {isInitialLoading ? (
              <div className="space-y-3">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-52 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              </div>
            ) : history.length === 0 ? (
              <ListEmptyState
                title="No history entries"
                description="Profile and payment updates will be listed here."
                actionLabel="Back to Overview"
                onAction={() => onOpenChange(false)}
                className="min-h-36"
              />
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <Card key={`${entry.action}-${entry.id}`}>
                    <CardContent className="space-y-1 pt-4 text-sm">
                      <p className="font-medium">{entry.action}</p>
                      <p className="text-muted-foreground">
                        {formatDate(entry.createdAt, "MMM dd, yyyy hh:mm a")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
