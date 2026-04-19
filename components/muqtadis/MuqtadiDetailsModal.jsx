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
import { queryKeys } from '@/lib/queryKeys';
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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const detailsData = detailQuery.data ?? buildInitialDetails(selectedMuqtadi, details) ?? null;
  const payments = activeTab === 'payments'
    ? (paymentsQuery.data ?? detailsData?.payments ?? [])
    : (detailsData?.payments ?? []);
  const history = activeTab === 'history'
    ? (historyQuery.data ?? detailsData?.history ?? [])
    : (detailsData?.history ?? []);

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
  const pendingExpiryMinutes = authLinkState?.expiresInMinutes ?? detailsData?.setupLinkExpiresInMinutes ?? null;
  const activeLink = authLinkState?.link ?? '';

  const isAlreadyIncludedInCurrentCycle = useMemo(() => {
    if (!detailsData || detailsData.dues.length === 0) {
      return false;
    }

    const latestDue = [...detailsData.dues].sort((a, b) => {
      const ay = a.year ?? 0;
      const by = b.year ?? 0;
      if (ay !== by) return by - ay;
      const am = a.month ?? 0;
      const bm = b.month ?? 0;
      if (am !== bm) return bm - am;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];

    if (!latestDue?.month || !latestDue?.year) {
      return false;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return latestDue.month === currentMonth && latestDue.year === currentYear;
  }, [detailsData]);

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
                        disabled={isIncludingInCycle || isAlreadyIncludedInCurrentCycle}
                        onClick={onIncludeInCycle}
                      >
                        {isIncludingInCycle ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Add to Cycle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRemovingFromCycle || !isAlreadyIncludedInCurrentCycle || removeBlockedByPayment}
                        onClick={onRemoveFromCycle}
                      >
                        {isRemovingFromCycle ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Remove from Cycle
                      </Button>
                    </div>
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
              {!detailsData ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ) : detailsData.dues.length === 0 ? (
                <ListEmptyState
                  title="No dues generated yet"
                  description="Start a salary month to generate dues for members."
                  actionLabel="Open Salary Months"
                  actionHref="/dashboard/imam-salary/cycles"
                  className="min-h-36"
                />
              ) : (
                detailsData.dues.map((due) => (
                  <Card key={due.id}>
                    <CardContent className="space-y-2 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{formatCycleLabel(due.month, due.year)}</p>
                        <Badge variant={due.status === 'PAID' ? 'default' : 'secondary'}>{due.status}</Badge>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-3">
                        <p><span className="text-muted-foreground">Expected:</span> {formatCurrency(due.expectedAmount)}</p>
                        <p><span className="text-muted-foreground">Paid:</span> {formatCurrency(due.paidAmount)}</p>
                        <p><span className="text-muted-foreground">Cycle:</span> {getCycleStatus(due.month, due.year)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
