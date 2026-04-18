import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { DrawerSkeleton } from '@/components/common/loading-skeletons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MuqtadiDetailsModal({
  open,
  onOpenChange,
  details,
  selectedMuqtadi,
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
  const [dependentName, setDependentName] = useState('');

  useEffect(() => {
    if (!open) {
      setDependentName('');
    }
  }, [open, details?.id]);

  const memberNames = useMemo(() => {
    if (!details) return [];
    if (Array.isArray(details.memberNames) && details.memberNames.length > 0) {
      return details.memberNames.filter((name) => Boolean(String(name || '').trim()));
    }
    if (details.name) {
      return [details.name];
    }
    return [];
  }, [details]);

  const accountState = details?.accountState || 'OFFLINE';
  const pendingExpiryMinutes = authLinkState?.expiresInMinutes ?? details?.setupLinkExpiresInMinutes ?? null;
  const activeLink = authLinkState?.link ?? '';

  const isAlreadyIncludedInCurrentCycle = useMemo(() => {
    if (!details || details.dues.length === 0) {
      return false;
    }

    const latestDue = [...details.dues].sort((a, b) => {
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
  }, [details]);

  const currentCycleDue = useMemo(() => {
    if (!details) return null;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return details.dues.find((due) => due.month === currentMonth && due.year === currentYear) ?? null;
  }, [details]);

  const removeBlockedByPayment = Number(currentCycleDue?.paidAmount ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{details?.name || 'Household Details'}</SheetTitle>
          <SheetDescription>Overview, dues, payments, and full admin controls</SheetDescription>
        </SheetHeader>

        {!details ? (
          <DrawerSkeleton />
        ) : (
          <Tabs defaultValue="overview" className="mt-4 space-y-3">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {details.name}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {details.phone || details.whatsappNumber || '-'}</p>
                  <p>
                    <span className="text-muted-foreground">Account:</span>{' '}
                    {accountState === 'ACTIVE' ? 'Online' : accountState === 'PENDING_SETUP' ? 'Pending Setup' : 'Offline'}
                  </p>
                  <p><span className="text-muted-foreground">Members:</span> {details.householdMembers}</p>
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
                        <div key={`${details.id}-member-${index}`} className="flex items-center justify-between rounded-md border px-2 py-1.5">
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
              {details.dues.length === 0 ? (
                <ListEmptyState
                  title="No dues generated yet"
                  description="Start a salary month to generate dues for members."
                  actionLabel="Open Salary Months"
                  actionHref="/dashboard/imam-salary/cycles"
                  className="min-h-36"
                />
              ) : (
                details.dues.map((due) => (
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
              {details.payments.length === 0 ? (
                <ListEmptyState
                  title="No payment records yet"
                  description="Record the first payment to start this history."
                  actionLabel="Record Payment"
                  onAction={onOpenRecordPayment}
                  className="min-h-36"
                />
              ) : (
                details.payments.map((entry) => {
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
              {details.history.length === 0 ? (
                <ListEmptyState
                  title="No history entries"
                  description="Profile and payment updates will be listed here."
                  actionLabel="Back to Overview"
                  onAction={() => onOpenChange(false)}
                  className="min-h-36"
                />
              ) : (
                details.history.map((entry) => (
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
        )}
      </SheetContent>
    </Sheet>
  );
}
