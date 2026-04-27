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
  const [pendingPreviousDue, setPendingPreviousDue] = useState("0");
  const [activeTab, setActiveTab] = useState("overview");
  const muqtadiId = selectedMuqtadi?.id;
  void details;

  const detailQuery = useQuery({
    queryKey: queryKeys.muqtadiDetail(muqtadiId),
    queryFn: () => muqtadisService.getById(muqtadiId),
    enabled: Boolean(muqtadiId),
    keepPreviousData: false,
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.muqtadiPayments(muqtadiId),
    queryFn: () => muqtadisService.getDetailPayments(muqtadiId),
    enabled: activeTab === "payments" && Boolean(muqtadiId),
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.muqtadiHistory(muqtadiId),
    queryFn: () => muqtadisService.getDetailHistory(muqtadiId),
    enabled: activeTab === "history" && Boolean(muqtadiId),
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const detail = detailQuery.data;
  const payments = useMemo(
    () =>
      activeTab === "payments"
        ? (paymentsQuery.data ?? detail?.payments ?? [])
        : (detail?.payments ?? []),
    [activeTab, paymentsQuery.data, detail?.payments],
  );

  const history = useMemo(
    () =>
      activeTab === "history"
        ? (historyQuery.data ?? detail?.history ?? [])
        : (detail?.history ?? []),
    [activeTab, historyQuery.data, detail?.history],
  );

  const dues = useMemo(() => detail?.dues ?? [], [detail?.dues]);

  useEffect(() => {
    if (!open) {
      setDependentName("");
      setActiveTab("overview");
      setPendingPreviousDue("0");
    }
  }, [open]);

  useEffect(() => {
    if (!detail || !isPendingHousehold) return;
    setPendingPreviousDue(String(detail.previousDue ?? 0));
  }, [detail, isPendingHousehold]);

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

  const accountState = detail?.accountState || "OFFLINE";
  const isPendingHousehold = detail?.isVerified === false;
  // const hasCycle = Boolean(detail?.hasCycle);
  // const hasCycle = Array.isArray(detail?.dues);
  const hasCycle = detail?.hasCycle === true;
  // const isHouseholdInCycle = Boolean(detail?.isHouseholdInCycle);
  const hasAnyCycleData = Array.isArray(detail?.dues);
  const safeHasCycle = hasCycle || hasAnyCycleData;
  const isHouseholdInCycle = detail?.isHouseholdInCycle === true;
  const pendingExpiryMinutes =
    authLinkState?.expiresInMinutes ??
    detail?.setupLinkExpiresInMinutes ??
    null;
  const activeLink = authLinkState?.link ?? "";

  const currentCycleDue = useMemo(() => {
    if (!detail) return null;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return (
      dues.find(
        (due) => due.month === currentMonth && due.year === currentYear,
      ) ?? null
    );
  }, [detail, dues]);

  const removeBlockedByPayment = Number(currentCycleDue?.paidAmount ?? 0) > 0;

  if (detailQuery.isLoading || !detail) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Loading...</SheetTitle>
          <SheetDescription>
            Fetching household details
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>
            {detail?.name || selectedMuqtadi?.name || "Household Details"}
          </SheetTitle>
          <SheetDescription>
            Overview, dues, payments, and full admin controls
          </SheetDescription>
        </SheetHeader>

        {isPendingHousehold ? (
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-4 space-y-3"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dues">Dues</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            <Card>
              <CardContent className="space-y-2 text-sm">
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
                  <span className="text-muted-foreground">Credit Balance:</span>{" "}
                  {formatCurrency(detail?.creditBalance ?? 0)}
                </p>
                <p>
                  <span className="text-muted-foreground">Previous Due:</span>{" "}
                  {formatCurrency(detail?.previousDue ?? 0)}
                </p>
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

                {detailQuery.isLoading ? (
                  <p className="text-muted-foreground">Loading members...</p>
                ) : memberNames.length === 0 ? (
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
                      {isIncludingInCycle ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : null}
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
                      {isRemovingFromCycle ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Remove from Cycle
                    </Button>
                  </div>
                  {/* {!hasCycle && !isIncludingInCycle ? (
                    <p className="text-xs text-muted-foreground">
                      No active cycle found.
                    </p>
                  ) : null} */}
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
          </TabsContent>

          <TabsContent value="dues" className="space-y-3">
            {detailQuery.isLoading ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
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
              dues.map((due) => {
                const expectedAmount = Math.max(
                  Number(due.expectedAmount ?? 0),
                  0,
                );
                const paidAmount = Math.max(Number(due.paidAmount ?? 0), 0);
                // const creditAmount = Math.max(Number(due.creditAmount ?? 0), 0);
                const remainingAmount = Math.max(
                  Number(due.remainingAmount ?? 0),
                  0,
                );
                return (
                  <Card key={due.id}>
                    <CardContent className="space-y-2 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {formatCycleLabel(due.month, due.year)}
                        </p>
                        <Badge
                          variant={
                            remainingAmount > 0 ? "secondary" : "default"
                          }
                        >
                          {remainingAmount > 0 ? "PENDING" : "PAID"}
                        </Badge>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <p>
                          <span className="text-muted-foreground">Total:</span>{" "}
                          {formatCurrency(expectedAmount)}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Paid:</span>{" "}
                          {formatCurrency(paidAmount)}
                        </p>
                        {/* {creditAmount > 0 ? (
                                  <p className="text-emerald-700">
                                    <span className="text-muted-foreground">Credit:</span> {formatCurrency(creditAmount)}
                                  </p>
                                ) : (
                                  <p><span className="text-muted-foreground">Cycle:</span> {getCycleStatus(due.month, due.year)}</p>
                                )} */}

                        <p>
                          <span className="text-muted-foreground">Cycle:</span>{" "}
                          {getCycleStatus(due.month, due.year)}
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
                          {remainingAmount > 0
                            ? formatCurrency(remainingAmount)
                            : "Paid"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3">
            <Card>
              <CardContent className="pt-4 text-sm space-y-1">
                <div className="text-sm space-y-1">
                  <p>
                    Total Due: {formatCurrency(detail?.overview?.totalDue ?? 0)}
                  </p>
                  <p>
                    Total Paid:{" "}
                    {formatCurrency(detail?.overview?.totalPaid ?? 0)}
                  </p>
                  <p>
                    Credit: {formatCurrency(detail?.overview?.credit ?? detail?.creditBalance ?? 0)}
                  </p>
                  <p className="font-semibold">
                    Outstanding:{" "}
                    {formatCurrency(detail?.overview?.outstandingAmount ?? 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {detailQuery.isLoading ||
            (activeTab === "payments" &&
              paymentsQuery.isFetching &&
              payments.length === 0) ? (
              <Card>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ) : !safeHasCycle ? (
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
              payments.map((entry) => {
                const paymentStatus = String(
                  entry.details?.status || "PENDING",
                ).toLowerCase();
                const paymentAmount = Number(entry.details?.amount || 0);
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
                        {/* <Badge variant="secondary">{paymentStatus}</Badge> */}
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
                        {/* <p>{formatCurrency(paymentAmount)}</p> */}
                        <div>
                          <p className="font-medium">
                            {formatCurrency(paymentAmount)}
                          </p>
                          {entry.details?.cycle &&
                            entry.details?.cycle?.year && (
                              <p className="text-xs text-muted-foreground">
                                Cycle:{" "}
                                {formatCycleLabel(
                                  entry.details.cycle.month,
                                  entry.details.cycle.year,
                                )}
                              </p>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {entry.details?.method || "—"} •{" "}
                          {entry.details?.type || "—"}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenPaymentDetail(entry.id)}
                        >
                          View Payment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {activeTab === "history" &&
            historyQuery.isFetching &&
            history.length === 0 ? (
              <Card>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-52 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ) : history.length === 0 ? (
              <ListEmptyState
                title="No history entries"
                description="Profile and payment updates will be listed here."
                actionLabel="Back to Overview"
                onAction={() => onOpenChange(false)}
                className="min-h-36"
              />
            ) : (
              history.map((entry) => (
                <Card key={`${entry.action}-${entry.id}`}>
                  <CardContent className="space-y-1 pt-4 text-sm">
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-muted-foreground">
                      {formatDate(entry.createdAt, "MMM dd, yyyy hh:mm a")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
