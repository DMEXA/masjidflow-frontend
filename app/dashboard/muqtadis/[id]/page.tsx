'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { PageHeader } from '@/components/dashboard/page-header';
import { PageBackButton } from '@/components/common/page-back-button';
import {
  muqtadisService,
  type MuqtadiDetails,
  type MuqtadiStatus,
} from '@/services/muqtadis.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatCycleLabel, formatDate, getCycleStatus } from '@/src/utils/format';
import { parseStrictAmountInput, parseStrictIntegerInput } from '@/src/utils/numeric-input';
import { isValidIndianPhone, normalizeIndianPhone } from '@/src/utils/phone';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';

type SortOrder = 'newest' | 'oldest';

export default function MuqtadiDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [details, setDetails] = useState<MuqtadiDetails | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    householdMembers: '1',
    whatsappNumber: '',
    notes: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    cycleId: '',
    amount: '',
    method: 'CASH' as 'CASH' | 'UPI' | 'BANK',
    utr: '',
    reference: '',
    notes: '',
  });

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isLoginFormOpen, setIsLoginFormOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: '',
    autoGeneratePassword: true,
  });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isIncludingInCycle, setIsIncludingInCycle] = useState(false);
  const [isRemovingFromCycle, setIsRemovingFromCycle] = useState(false);
  const { isAdmin, isSuperAdmin } = usePermission();

  const load = useCallback(async () => {
    if (!params.id) return;

    setIsLoading(true);
    try {
      const result = await muqtadisService.getById(params.id);
      setDetails(result);
      setEditForm({
        name: result.name,
        householdMembers: String(result.householdMembers),
        whatsappNumber: result.whatsappNumber || '',
        notes: result.notes || '',
      });
      setLoginForm((prev) => ({
        ...prev,
        phone: result.phone || result.whatsappNumber || '',
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load household details'));
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingAmount = useMemo(() => {
    if (!details) return 0;
    return Math.max(details.overview.outstandingAmount ?? details.overview.totalDue - details.overview.totalPaid, 0);
  }, [details]);

  const sortedDues = useMemo(() => {
    if (!details) return [];
    return [...details.dues].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [details, sortOrder]);

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

  const isDeleted = Boolean(details?.status === 'DISABLED');
  const isUnverified = Boolean(details?.isVerified === false);
  const includeBlocked = isDeleted || isUnverified;

  const canShowIncludeButton = (isAdmin || isSuperAdmin) && !isAlreadyIncludedInCurrentCycle;
  const canShowRemoveButton = (isAdmin || isSuperAdmin) && isAlreadyIncludedInCurrentCycle;
  const currentCycleDue = useMemo(() => {
    if (!details) return null;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return details.dues.find((due) => due.month === currentMonth && due.year === currentYear) ?? null;
  }, [details]);
  const removeBlockedByPayment = Number(currentCycleDue?.paidAmount ?? 0) > 0;

  const sortedPayments = useMemo(() => {
    if (!details) return [];
    return [...details.payments].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [details, sortOrder]);

  const sortedHistory = useMemo(() => {
    if (!details) return [];
    return [...details.history].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [details, sortOrder]);

  const copyUtr = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('UTR copied');
    } catch {
      toast.error('Failed to copy UTR');
    }
  };

  const updateProfile = async () => {
    if (!details) return;

    const householdMembers = parseStrictIntegerInput(editForm.householdMembers);
    if (!editForm.name.trim() || householdMembers === null || householdMembers < 1) {
      toast.error('Name and valid household members are required');
      return;
    }

    setSubmitting(true);
    try {
      await muqtadisService.update(details.id, {
        name: editForm.name.trim(),
        householdMembers,
        whatsappNumber: editForm.whatsappNumber.trim() || undefined,
        phone: editForm.whatsappNumber.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      toast.success('Household updated');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update household'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (nextStatus: MuqtadiStatus) => {
    if (!details) return;

    setSubmitting(true);
    try {
      if (nextStatus === 'DISABLED') {
        await muqtadisService.disable(details.id);
        toast.success('Household disabled');
      } else {
        await muqtadisService.enable(details.id);
        toast.success('Household enabled');
      }
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    } finally {
      setSubmitting(false);
    }
  };

  const removeMuqtadi = async () => {
    if (!details) return;

    setSubmitting(true);
    try {
      await muqtadisService.remove(details.id);
      toast.success('Household removed');
      router.push('/dashboard/muqtadis');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete household'));
    } finally {
      setSubmitting(false);
    }
  };

  const includeInCurrentCycle = async () => {
    if (!details) return;

    setIsIncludingInCycle(true);
    try {
      const result = await muqtadisService.includeInCurrentCycle(details.id);
      if (result.alreadyIncluded) {
        toast.success('Muqtadi is already included in current cycle');
      } else {
        toast.success('Muqtadi included in current cycle');
      }
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to include muqtadi in current cycle'));
    } finally {
      setIsIncludingInCycle(false);
    }
  };

  const removeFromCurrentCycle = async () => {
    if (!details) return;

    setIsRemovingFromCycle(true);
    try {
      const result = await muqtadisService.removeFromCurrentCycle(details.id);
      if (result.notFound) {
        toast.success('Muqtadi is not included in current cycle');
      } else if (result.removed) {
        toast.success('Muqtadi removed from current cycle');
      }
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove muqtadi from current cycle'));
    } finally {
      setIsRemovingFromCycle(false);
    }
  };

  const adjustPayment = async () => {
    if (!details) return;

    const amount = parseStrictAmountInput(adjustForm.amount);
    if (!adjustForm.cycleId || amount === null || amount <= 0) {
      toast.error('Month and valid amount are required');
      return;
    }

    if (!adjustForm.utr.trim()) {
      toast.error('Provide UTR or payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      await muqtadisService.recordPayment({
        muqtadiId: details.id,
        cycleId: adjustForm.cycleId,
        amount,
        method: adjustForm.method,
        utr: adjustForm.utr.trim() || undefined,
        reference: adjustForm.reference.trim() || undefined,
        notes: adjustForm.notes.trim() || undefined,
      });
      await invalidateMoneyQueries(queryClient);
      toast.success('Payment adjustment added as new transaction');
      setAdjustForm({ cycleId: '', amount: '', method: 'CASH', utr: '', reference: '', notes: '' });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to adjust payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyPayment = async (transactionId: string) => {
    setSubmitting(true);
    try {
      await muqtadisService.verifyPayment(transactionId);
      toast.success('Payment marked as verified');
      await invalidateMoneyQueries(queryClient);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const enableLogin = async () => {
    if (!details) return;

    if (!loginForm.phone.trim()) {
      toast.error('Phone is required');
      return;
    }

    if (!isValidIndianPhone(loginForm.phone)) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }

    const normalizedPhone = normalizeIndianPhone(loginForm.phone);
    if (!normalizedPhone) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }

    if (!loginForm.autoGeneratePassword && loginForm.password.trim().length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      const result = await muqtadisService.enableLogin(details.id, {
        phone: normalizedPhone,
        password: loginForm.autoGeneratePassword ? undefined : loginForm.password.trim(),
        autoGeneratePassword: loginForm.autoGeneratePassword,
      });
      setGeneratedPassword(result.generatedPassword);
      setIsLoginFormOpen(false);
      setLoginForm((prev) => ({ ...prev, password: '' }));
      toast.success('Login enabled for household');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to enable login'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !details) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-background p-2">
        <PageBackButton fallbackHref="/dashboard/muqtadis" />
      </div>

      <PageHeader title="Household Details" description="Manage household profile, dues and payment corrections" />

      <div className="flex justify-end">
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-40"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Due</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(details.overview.totalDue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(details.overview.totalPaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(pendingAmount)}</p></CardContent>
        </Card>
      </div>

      {canShowIncludeButton || canShowRemoveButton ? (
        <div className="flex justify-end gap-2">
          {canShowIncludeButton ? (
            <Button
              onClick={includeInCurrentCycle}
              disabled={includeBlocked || isIncludingInCycle || isRemovingFromCycle || submitting}
              title={isDeleted ? 'Cannot add deleted muqtadi to cycle' : isUnverified ? 'Muqtadi must be verified' : ''}
            >
              {isIncludingInCycle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Include in Current Cycle
            </Button>
          ) : null}
          {canShowRemoveButton ? (
            <div title={removeBlockedByPayment ? 'Cannot remove: payment already made' : ''}>
              <Button
                variant="outline"
                onClick={removeFromCurrentCycle}
                disabled={removeBlockedByPayment || isRemovingFromCycle || isIncludingInCycle || submitting}
              >
                {isRemovingFromCycle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Remove from Current Cycle
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">Basic profile and household details.</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><Label>Household Members</Label><Input type="text" inputMode="numeric" pattern="^\d+$" value={editForm.householdMembers} onChange={(e) => setEditForm((p) => ({ ...p, householdMembers: e.target.value }))} /></div>
          <div><Label>Status</Label><div className="pt-2"><Badge variant={details.status === 'ACTIVE' ? 'default' : 'secondary'}>{details.status}</Badge></div></div>
          <div><Label>WhatsApp Number</Label><Input value={details.whatsappNumber || '-'} disabled /></div>
          {details.memberNames?.length ? (
            <div className="sm:col-span-2">
              <Label>Member Names</Label>
              <p className="pt-2 text-sm text-muted-foreground">{details.memberNames.join(', ')}</p>
            </div>
          ) : null}
          <div><Label>WhatsApp Number</Label><Input value={editForm.whatsappNumber} onChange={(e) => setEditForm((p) => ({ ...p, whatsappNumber: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="text-sm text-muted-foreground">Add payment adjustments as new transactions to keep audit trail intact.</p>
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Adjust Payment</CardTitle>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAdjusting((prev) => !prev)}>
            Adjust Payment
          </Button>
        </CardHeader>
        {isAdjusting ? (
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Month</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={adjustForm.cycleId} onChange={(e) => setAdjustForm((p) => ({ ...p, cycleId: e.target.value }))}>
              <option value="">Select month</option>
              {sortedDues.map((due) => (
                <option key={due.id} value={due.cycleId}>{`${formatCycleLabel(due.month, due.year)} (${getCycleStatus(due.month, due.year)})`}</option>
              ))}
            </select>
          </div>
          <div><Label>Amount</Label><Input type="text" inputMode="decimal" pattern="^\d+(?:\.\d{1,2})?$" value={adjustForm.amount} onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))} /></div>
          <div>
            <Label>Method</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={adjustForm.method} onChange={(e) => setAdjustForm((p) => ({ ...p, method: e.target.value as 'CASH' | 'UPI' | 'BANK' }))}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div><Label>UTR</Label><Input value={adjustForm.utr} onChange={(e) => setAdjustForm((p) => ({ ...p, utr: e.target.value }))} /></div>
          <div><Label>Reference</Label><Input value={adjustForm.reference} onChange={(e) => setAdjustForm((p) => ({ ...p, reference: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={adjustForm.notes} onChange={(e) => setAdjustForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          <div className="sm:col-span-2">
            <Button onClick={adjustPayment} disabled={submitting || isDeleted}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Adjust Payment</Button>
          </div>
        </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">Tap "Adjust Payment" to record an additional transaction without overwriting existing records.</p>
            {isDeleted ? <p className="mt-2 text-sm text-muted-foreground">Payments are disabled for deleted muqtadi.</p> : null}
          </CardContent>
        )}
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">History</h2>
        <p className="text-sm text-muted-foreground">Complete transaction history for this household.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Payments History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sortedPayments.length === 0 ? (
            <ListEmptyState
              title="No payment transactions"
              description="Add an adjustment transaction to start payment history."
              actionLabel="Adjust Payment"
              onAction={() => setIsAdjusting(true)}
              className="min-h-36"
            />
          ) : (
            sortedPayments.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm leading-6">
                <p className="font-medium">{formatDate(item.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
                <p>Amount: {formatCurrency(Number(item.details?.amount || 0))}</p>
                <p>Method: {String(item.details?.method || '-')}</p>
                <p>Status: {String(item.details?.status || '-')}</p>
                {(item.details?.status as string) === 'PENDING' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!item.details?.screenshotUrl}
                      onClick={() => {
                        const proofUrl = String(item.details?.screenshotUrl || '');
                        if (!proofUrl) return;
                        window.open(proofUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      View Proof
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => void verifyPayment(item.id)}
                    >
                      Verify
                    </Button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <p>UTR: {String(item.details?.utr || '-')}</p>
                  {item.details?.utr ? (
                    <Button size="sm" variant="ghost" onClick={() => copyUtr(String(item.details?.utr))}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy UTR
                    </Button>
                  ) : null}
                </div>
                <p>
                  Month:{' '}
                  {item.details?.month && item.details?.year
                    ? `${formatCycleLabel(Number(item.details.month), Number(item.details.year))} (${getCycleStatus(Number(item.details.month), Number(item.details.year))})`
                    : '-'}
                </p>
                <p className="text-muted-foreground">Reference: {String(item.details?.reference || '-')}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sortedHistory.length === 0 ? (
            <ListEmptyState
              title="No history entries"
              description="Activity changes for this household will appear here."
              actionLabel="Back to Households"
              actionHref="/dashboard/muqtadis"
              className="min-h-36"
            />
          ) : (
            sortedHistory.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 text-sm leading-6">
                <p className="font-medium">{entry.action}</p>
                <p className="text-muted-foreground">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Actions</h2>
        <p className="text-sm text-muted-foreground">Administrative actions for profile updates and account status.</p>
      </div>
      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <Button onClick={updateProfile} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
          <ActionOverflowMenu
            items={[
              ...(!details.userId
                ? [{ label: 'Enable Login', onSelect: () => setIsLoginFormOpen((prev) => !prev), disabled: submitting }]
                : []),
              ...(details.status === 'ACTIVE'
                ? [{ label: 'Disable', onSelect: () => toggleStatus('DISABLED'), disabled: submitting }]
                : [{ label: 'Enable', onSelect: () => toggleStatus('ACTIVE'), disabled: submitting }]),
              { label: 'Delete', onSelect: () => setIsDeleteConfirmOpen(true), destructive: true, disabled: submitting },
            ]}
          />
          {details.userId ? <Badge variant="default" className="h-10 px-3">Login Enabled</Badge> : null}
        </CardContent>
      </Card>

      {isLoginFormOpen ? (
        <Card>
          <CardHeader><CardTitle>Enable Login</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={loginForm.phone}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={loginForm.autoGeneratePassword}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, autoGeneratePassword: e.target.checked }))}
              />
              Auto-generate password
            </label>
            {!loginForm.autoGeneratePassword ? (
              <div className="sm:col-span-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                />
              </div>
            ) : null}
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button onClick={enableLogin} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enable Login
              </Button>
              <Button variant="outline" onClick={() => setIsLoginFormOpen(false)} disabled={submitting}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {generatedPassword ? (
        <Card>
          <CardHeader><CardTitle>Generated Password</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">Share this temporary password with the muqtadi user:</p>
            <p className="mt-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm">{generatedPassword}</p>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the muqtadi household from records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeMuqtadi();
                setIsDeleteConfirmOpen(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
