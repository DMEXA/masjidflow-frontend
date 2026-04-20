import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListEmptyState } from '@/components/common/list-empty-state';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/lib/query-keys';
import { muqtadisService } from '@/services/muqtadis.service';

function buildInitialDetails(selectedMuqtadi, details) {
  if (details) return details;
  if (!selectedMuqtadi) return undefined;

  return {
    id: selectedMuqtadi.id,
    userId: selectedMuqtadi.userId ?? null,
    accountState: selectedMuqtadi.accountState ?? 'OFFLINE',
    setupLinkExpiresAt: selectedMuqtadi.setupLinkExpiresAt ?? null,
    setupLinkExpiresInMinutes: selectedMuqtadi.setupLinkExpiresInMinutes ?? null,
    name: selectedMuqtadi.name,
    fatherName: selectedMuqtadi.fatherName ?? '',
    email: selectedMuqtadi.email ?? null,
    householdMembers: selectedMuqtadi.householdMembers ?? 1,
    memberNames: Array.isArray(selectedMuqtadi.memberNames) ? selectedMuqtadi.memberNames : [selectedMuqtadi.name].filter(Boolean),
    whatsappNumber: selectedMuqtadi.whatsappNumber ?? null,
    isVerified: selectedMuqtadi.isVerified ?? false,
    category: selectedMuqtadi.category ?? null,
    phone: selectedMuqtadi.phone ?? null,
    notes: selectedMuqtadi.notes ?? null,
    status: selectedMuqtadi.status ?? 'ACTIVE',
    hasCycle: false,
    isHouseholdInCycle: false,
    overview: {
      totalDue: 0,
      totalPaid: 0,
      outstandingAmount: 0,
    },
    dues: [],
    payments: [],
    history: [],
  };
}

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
  const queryClient = useQueryClient();
  const [dependentName, setDependentName] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const muqtadiId = selectedMuqtadi?.id;

  const detailQuery = useQuery({
    queryKey: queryKeys.muqtadiDetail(muqtadiId),
    queryFn: () => muqtadisService.getById(muqtadiId),
    enabled: Boolean(muqtadiId),
    initialData: () => buildInitialDetails(selectedMuqtadi, details),
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.muqtadiPayments(muqtadiId),
    queryFn: async () => {
      const cachedDetail = queryClient.getQueryData(queryKeys.muqtadiDetail(muqtadiId));
      if (cachedDetail && Array.isArray(cachedDetail.payments)) {
        return cachedDetail.payments;
      }
      return muqtadisService.getDetailPayments(muqtadiId);
    },
    enabled: activeTab === 'payments' && Boolean(muqtadiId),
    initialData: () => detailQuery.data?.payments ?? [],
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const duesQuery = useQuery({
    queryKey: queryKeys.muqtadiDues(muqtadiId),
    queryFn: async () => {
      const cachedDetail = queryClient.getQueryData(queryKeys.muqtadiDetail(muqtadiId));
      if (cachedDetail && Array.isArray(cachedDetail.dues)) {
        return cachedDetail.dues;
      }
      return muqtadisService.getDetailDues(muqtadiId);
    },
    enabled: activeTab === 'dues' && Boolean(muqtadiId),
    initialData: () => detailQuery.data?.dues ?? [],
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.muqtadiHistory(muqtadiId),
    queryFn: async () => {
      const cachedDetail = queryClient.getQueryData(queryKeys.muqtadiDetail(muqtadiId));
      if (cachedDetail && Array.isArray(cachedDetail.history)) {
        return cachedDetail.history;
      }
      return muqtadisService.getDetailHistory(muqtadiId);
    },
    enabled: activeTab === 'history' && Boolean(muqtadiId),
    initialData: () => detailQuery.data?.history ?? [],
    staleTime: 8000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const detailsData = detailQuery.data ?? buildInitialDetails(selectedMuqtadi, details) ?? null;
  const payments = activeTab === 'payments'
    ? (paymentsQuery.data ?? detailsData?.payments ?? [])
    : (detailsData?.payments ?? []);
  const history = activeTab === 'history'
    ? (historyQuery.data ?? detailsData?.history ?? [])
    : (detailsData?.history ?? []);
  const dues = activeTab === 'dues'
    ? (duesQuery.data ?? detailsData?.dues ?? [])
    : (detailsData?.dues ?? []);

  useEffect(() => {
    if (!open) {
      setDependentName('');
      setActiveTab('overview');
    }
  }, [open]);

  useEffect(() => {
    if (detailsData && onDetailsChange) {
      onDetailsChange(detailsData);
    }
  }, [detailsData, onDetailsChange]);

  const memberNames = useMemo(() => {
    if (!detailsData) return [];
    if (Array.isArray(detailsData.memberNames) && detailsData.memberNames.length > 0) {
      return detailsData.memberNames.filter((name) => Boolean(String(name || '').trim()));
    }
    if (detailsData.name) {
      return [detailsData.name];
    }
    return [];
  }, [detailsData]);

  const accountState = detailsData?.accountState || 'OFFLINE';
  const isPendingHousehold = Boolean(
    (detailsData && detailsData.isVerified === false)
    || (selectedMuqtadi && selectedMuqtadi.isVerified === false),
  );
  const hasCycle = Boolean(detailsData?.hasCycle);
  const isHouseholdInCycle = Boolean(detailsData?.isHouseholdInCycle);
  const pendingExpiryMinutes = authLinkState?.expiresInMinutes ?? detailsData?.setupLinkExpiresInMinutes ?? null;
  const activeLink = authLinkState?.link ?? '';

  const currentCycleDue = useMemo(() => {
    if (!detailsData) return null;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return detailsData.dues.find((due) => due.month === currentMonth && due.year === currentYear) ?? null;
  }, [detailsData]);

  const removeBlockedByPayment = Number(currentCycleDue?.paidAmount ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{detailsData?.name || selectedMuqtadi?.name || 'Household Details'}</SheetTitle>
          <SheetDescription>Overview, dues, payments, and full admin controls</SheetDescription>
        </SheetHeader>

        {isPendingHousehold ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-3 px-2">
              <Button type="button" size="sm" variant="outline" className="min-w-26 rounded-xl" onClick={onOpenEditDetails}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-26 rounded-xl"
                onClick={onVerifyPending}
                disabled={isPendingActionLoading}
              >
                {isPendingActionLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
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
                {isPendingActionLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Reject
              </Button>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 space-y-3">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {detailsData?.name || selectedMuqtadi?.name || '-'}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {detailsData?.phone || detailsData?.whatsappNumber || selectedMuqtadi?.phone || selectedMuqtadi?.whatsappNumber || '-'}</p>
                  <p>
                    <span className="text-muted-foreground">Account:</span>{' '}
                    {accountState === 'ACTIVE' ? 'Online' : accountState === 'PENDING_SETUP' ? 'Pending Setup' : 'Offline'}
                  </p>
                  <p><span className="text-muted-foreground">Members:</span> {detailsData?.householdMembers ?? selectedMuqtadi?.householdMembers ?? '-'}</p>
                  <p><span className="text-muted-foreground">Join Date:</span> {selectedMuqtadi?.createdAt ? formatDate(selectedMuqtadi.createdAt) : '-'}</p>
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
                          setDependentName('');
                        }}
                        disabled={isUpdatingDependents || !dependentName.trim()}
                      >
                        {isUpdatingDependents ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                        Add
                      </Button>
                    </div>
                  </div>

                  {memberNames.length === 0 ? (
                    <p className="text-muted-foreground">No household members found.</p>
                  ) : (
                    <div className="space-y-2">
                      {memberNames.map((name, index) => (
                        <div key={`${detailsData?.id || selectedMuqtadi?.id || 'muqtadi'}-member-${index}`} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <p>{name}</p>
                            <Badge variant="secondary">{index === 0 ? 'Head' : 'Dependent'}</Badge>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemoveDependent(index)}
                            disabled={isUpdatingDependents || memberNames.length <= 1}
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cycle Control</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isIncludingInCycle || !hasCycle || isHouseholdInCycle}
                        onClick={onIncludeInCycle}
                      >
                        {isIncludingInCycle ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Add to Cycle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRemovingFromCycle || !hasCycle || !isHouseholdInCycle || removeBlockedByPayment}
                        onClick={onRemoveFromCycle}
                      >
                        {isRemovingFromCycle ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Remove from Cycle
                      </Button>
                    </div>
                    {!hasCycle ? (
                      <p className="text-xs text-muted-foreground">No active cycle found. Create a cycle first.</p>
                    ) : null}
                    {removeBlockedByPayment ? (
                      <p className="text-xs text-muted-foreground">
                        Cannot remove from cycle because a payment exists in the current cycle.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account Access</p>
                    {accountState === 'OFFLINE' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isGeneratingLoginLink}
                          onClick={onGenerateLoginLink}
                        >
                          {isGeneratingLoginLink ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Generate Login Link
                        </Button>
                      </div>
                    ) : null}

                    {accountState === 'PENDING_SETUP' ? (
                      <div className="space-y-2 rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">
                          Setup in progress{typeof pendingExpiryMinutes === 'number' ? ` • Expires in ${pendingExpiryMinutes} min` : ''}
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
                            {isGeneratingLoginLink ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                            Regenerate Link
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {accountState === 'ACTIVE' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSendingResetLink}
                          onClick={onSendResetLink}
                        >
                          {isSendingResetLink ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Reset Password
                        </Button>
                      </div>
                    ) : null}

                    {activeLink ? <Input readOnly value={activeLink} className="max-w-sm" /> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</p>
                    <Button type="button" size="sm" variant="outline" onClick={onOpenEditDetails}>
                      Edit Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dues" className="space-y-3">
              {!detailsData || (activeTab === 'dues' && duesQuery.isFetching && dues.length === 0) ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ) : !hasCycle ? (
                <ListEmptyState
                  title="No active cycle found"
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
                  description="Dues will appear here after generation."
                  className="min-h-36"
                />
              ) : (
                        dues.map((due) => {
                          const expectedAmount = Math.max(Number(due.expectedAmount ?? 0), 0);
                          const paidAmount = Math.max(Number(due.paidAmount ?? 0), 0);
                          const creditAmount = Math.max(Number(due.creditAmount ?? 0), 0);
                          const remainingAmount = Math.max(Number(due.remainingAmount ?? 0), 0);
                          return (
                  <Card key={due.id}>
                    <CardContent className="space-y-2 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{formatCycleLabel(due.month, due.year)}</p>
                                <Badge variant={remainingAmount > 0 ? 'secondary' : 'default'}>
                                  {remainingAmount > 0 ? 'PENDING' : 'PAID'}
                                </Badge>
                      </div>
                              <div className="grid gap-1 sm:grid-cols-2">
                                <p><span className="text-muted-foreground">Total:</span> {formatCurrency(expectedAmount)}</p>
                                <p><span className="text-muted-foreground">Paid:</span> {formatCurrency(paidAmount)}</p>
                                {creditAmount > 0 ? (
                                  <p className="text-emerald-700">
                                    <span className="text-muted-foreground">Credit:</span> {formatCurrency(creditAmount)}
                                  </p>
                                ) : (
                                  <p><span className="text-muted-foreground">Cycle:</span> {getCycleStatus(due.month, due.year)}</p>
                                )}
                                <p className={remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'}>
                                  <span className="text-muted-foreground">Remaining:</span>{' '}
                                  {remainingAmount > 0 ? formatCurrency(remainingAmount) : 'Paid'}
                                </p>
                      </div>
                    </CardContent>
                  </Card>
                          );
                        })
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-3">
              {activeTab === 'payments' && paymentsQuery.isFetching && payments.length === 0 ? (
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ) : !hasCycle ? (
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
                  const paymentStatus = String(entry.details?.status || 'PENDING').toLowerCase();
                  const paymentAmount = Number(entry.details?.amount || 0);
                  return (
                    <Card key={entry.id}>
                      <CardContent className="space-y-2 pt-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
                          <Badge variant="secondary">{paymentStatus}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p>{formatCurrency(paymentAmount)}</p>
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
              {activeTab === 'history' && historyQuery.isFetching && history.length === 0 ? (
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
                  <Card key={entry.id}>
                    <CardContent className="space-y-1 pt-4 text-sm">
                      <p className="font-medium">{entry.action}</p>
                      <p className="text-muted-foreground">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
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
