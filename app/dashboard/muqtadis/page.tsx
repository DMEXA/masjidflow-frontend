'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  ImageOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import type { Muqtadi } from '@/types';
import {
  muqtadisService,
  type ImamSalaryCycle,
  type MuqtadiDetails,
  type MuqtadiStatus,
} from '@/services/muqtadis.service';
import { usePermission } from '@/hooks/usePermission';
import { getErrorMessage } from '@/src/utils/error';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { formatCurrency, formatDate, formatCycleLabel, getCycleStatus } from '@/src/utils/format';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { useQueryClient } from '@tanstack/react-query';
import MuqtadiStats from '@/components/muqtadis/MuqtadiStats';
import MuqtadiFilters from '@/components/muqtadis/MuqtadiFilters';
import MuqtadiList from '@/components/muqtadis/MuqtadiList';
import { DrawerSkeleton } from '@/components/common/loading-skeletons';
import {
  useMuqtadis,
} from '@/hooks/useMuqtadis';
import { parseStrictAmountInput, parseStrictIntegerInput } from '@/src/utils/numeric-input';

const EMPTY_FORM = {
  name: '',
  fatherName: '',
  householdMembers: '1',
  dependents: [] as string[],
  whatsappNumber: '',
  notes: '',
};

export default function MuqtadisPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canManageMembers } = usePermission();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [trashItems, setTrashItems] = useState<Muqtadi[]>([]);
  const [trashPage, setTrashPage] = useState(1);
  const [trashTotalPages, setTrashTotalPages] = useState(1);
  const [isTrashLoading, setIsTrashLoading] = useState(false);

  const [selectedMuqtadi, setSelectedMuqtadi] = useState<Muqtadi | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MuqtadiDetails | null>(null);
  const [createAccountTarget, setCreateAccountTarget] = useState<Muqtadi | null>(null);
  const [createAccountForm, setCreateAccountForm] = useState({ email: '', password: '' });

  const [form, setForm] = useState(EMPTY_FORM);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createAccountLoadingId, setCreateAccountLoadingId] = useState<string | null>(null);

  const [cycles, setCycles] = useState<ImamSalaryCycle[]>([]);
  const [paymentMode, setPaymentMode] = useState<'new' | 'adjustment'>('new');
  const [pendingPaymentVerificationId, setPendingPaymentVerificationId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pendingPaymentDeleteId, setPendingPaymentDeleteId] = useState<string | null>(null);
  const [pendingPaymentRejectId, setPendingPaymentRejectId] = useState<string | null>(null);
  const [selectedPaymentDetailId, setSelectedPaymentDetailId] = useState<string | null>(null);
  const [paymentDetailImageFailed, setPaymentDetailImageFailed] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteUsageMeta, setInviteUsageMeta] = useState<{ maxUses?: number | null; usedCount?: number }>({});
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false);
  const [isInviteLimitDialogOpen, setIsInviteLimitDialogOpen] = useState(false);
  const [inviteLimit, setInviteLimit] = useState('1');
  const [isInviteLinkLoading, setIsInviteLinkLoading] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [imamFundSummary, setImamFundSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const detailRequestIdRef = useRef(0);
  const resizeDependents = (householdMembersValue: string, currentDependents: string[]) => {
    const parsed = parseStrictIntegerInput(householdMembersValue);
    const householdCount = parsed !== null && parsed > 0 ? Math.min(parsed, 50) : 1;
    const dependentsCount = Math.max(householdCount - 1, 0);
    return Array.from({ length: dependentsCount }, (_, index) => currentDependents[index] ?? '');
  };

  useEffect(() => {
    if (!canManageMembers) {
      router.replace('/dashboard');
    }
  }, [canManageMembers, router]);

  if (!canManageMembers) {
    return null;
  }

  const fetchCycles = useCallback(async () => {
    try {
      const result = await muqtadisService.getSalaryMonths();
      setCycles(result);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load salary months'));
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const fetchImamFundSummary = useCallback(async () => {
    try {
      const summary = await muqtadisService.getImamFundSummary();
      setImamFundSummary({
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        balance: summary.balance,
      });
    } catch {
      setImamFundSummary({ totalIncome: 0, totalExpense: 0, balance: 0 });
    }
  }, []);

  useEffect(() => {
    fetchImamFundSummary();
  }, [fetchImamFundSummary]);

  const refreshDetails = useCallback(async (id: string) => {
    const requestId = ++detailRequestIdRef.current;
    try {
      const detail = await muqtadisService.getById(id);
      if (requestId !== detailRequestIdRef.current) {
        return;
      }
      setSelectedDetails(detail);
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) {
        return;
      }
      toast.error(getErrorMessage(error, 'Failed to load household details'));
    }
  }, []);

  const {
    setItems,
    filteredItems,
    stats,
    filters,
    setFilters,
    actions,
    loading,
  } = useMuqtadis({
    enabled: canManageMembers,
    selectedDetailId: selectedDetails?.id ?? null,
    refreshDetails,
  });

  const isDeletedMuqtadi = useCallback((item: Muqtadi) => {
    return Boolean((item as Muqtadi & { isDeleted?: boolean }).isDeleted || item.isDisabled || item.status === 'DISABLED');
  }, []);

  const activeItems = useMemo(() => filteredItems.filter((item) => !isDeletedMuqtadi(item)), [filteredItems, isDeletedMuqtadi]);

  const fetchTrashItems = useCallback(async (page: number) => {
    setIsTrashLoading(true);
    try {
      const result = await muqtadisService.getTrash({ page, limit: 20 });
      setTrashItems(result.data);
      setTrashTotalPages(Math.max(result.totalPages || 1, 1));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load deleted households'));
    } finally {
      setIsTrashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageMembers || activeTab !== 'trash') return;
    void fetchTrashItems(trashPage);
  }, [activeTab, canManageMembers, fetchTrashItems, trashPage]);

  useEffect(() => {
    if (activeTab === 'trash') {
      setTrashPage(1);
    }
  }, [activeTab]);

  const openEdit = (item: Muqtadi) => {
    setSelectedMuqtadi(item);
    setForm({
      name: item.name,
      fatherName: item.fatherName,
      householdMembers: String(item.householdMembers ?? 1),
      dependents: resizeDependents(String(item.householdMembers ?? 1), []),
      whatsappNumber: item.whatsappNumber || '',
      notes: item.notes || '',
    });
    setIsEditOpen(true);
  };

  const openCreateAccount = (item: Muqtadi) => {
    setCreateAccountTarget(item);
    setCreateAccountForm({ email: item.email || '', password: '' });
    setIsCreateAccountOpen(true);
  };

  const openPayment = (item: Muqtadi) => {
    setSelectedMuqtadi(item);
    setPaymentMode('new');
    setEditingPaymentId(null);
    setSelectedCycleId(sortedCycles[0]?.id || '');
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentUtr('');
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentOpen(true);
  };

  const openPaymentDetails = (item: Muqtadi) => {
    setSelectedMuqtadi(item);
    setSelectedDetails(null);
    setSelectedPaymentDetailId(null);
    setPaymentDetailImageFailed(false);
    setIsDrawerOpen(true);
    void refreshDetails(item.id);
  };

  const openPaymentAdjustment = (item: Muqtadi, payment: MuqtadiDetails['payments'][number]) => {
    setSelectedMuqtadi(item);
    setPaymentMode('adjustment');
    setEditingPaymentId(payment.id);
    setSelectedCycleId(String(payment.details?.cycleId || ''));
    setPaymentAmount(String(Number(payment.details?.amount || 0) || ''));
    setPaymentMethod((String(payment.details?.method || 'CASH') as 'CASH' | 'UPI' | 'BANK'));
    setPaymentUtr(String(payment.details?.utr || ''));
    setPaymentReference(String(payment.details?.reference || ''));
    setPaymentNotes(`Adjustment for transaction ${payment.id}`);
    setIsPaymentOpen(true);
  };

  const handleCopyUtr = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('UTR copied');
    } catch {
      toast.error('Failed to copy UTR');
    }
  };

  const handleAddMuqtadi = async () => {
    const householdMembers = parseStrictIntegerInput(form.householdMembers);
    if (!form.name.trim() || !form.fatherName.trim() || householdMembers === null || householdMembers < 1) {
      toast.error('Name, father name, and valid household members are required');
      return;
    }

    const dependents = resizeDependents(form.householdMembers, form.dependents).map((name) => name.trim());
    if (dependents.some((name) => !name)) {
      toast.error('All dependents names are required');
      return;
    }

    setSubmitting(true);
    try {
      await muqtadisService.create({
        name: form.name.trim(),
        fatherName: form.fatherName.trim(),
        householdMembers,
        memberNames: [form.name.trim(), ...dependents],
        dependents: dependents.map((name) => ({ name })),
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        phone: form.whatsappNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Household added');
      setIsAddOpen(false);
      setForm(EMPTY_FORM);
      await actions.fetchItems();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to add household');
      const normalized = message.toLowerCase();
      if (
        normalized.includes('muqtadi already exists')
        || (normalized.includes('unique constraint') && normalized.includes('phone'))
      ) {
        toast.error('Muqtadi with this phone already exists');
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!createAccountTarget) return;
    if (!createAccountForm.email.trim() || !createAccountForm.password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    if (createAccountForm.password.trim().length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setCreateAccountLoadingId(createAccountTarget.id);
    try {
      const result = await muqtadisService.createAccount(createAccountTarget.id, {
        email: createAccountForm.email.trim(),
        password: createAccountForm.password.trim(),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === createAccountTarget.id
            ? {
                ...item,
                userId: result.userId,
                email: result.email,
              }
            : item,
        ),
      );

      toast.success('Account created and linked successfully');
      setIsCreateAccountOpen(false);
      setCreateAccountTarget(null);
      setCreateAccountForm({ email: '', password: '' });
      await actions.fetchItems();
      if (selectedDetails?.id === createAccountTarget.id) {
        await refreshDetails(createAccountTarget.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create account'));
    } finally {
      setSubmitting(false);
      setCreateAccountLoadingId(null);
    }
  };

  const handleUpdateMuqtadi = async () => {
    if (!selectedMuqtadi) return;

    const householdMembers = parseStrictIntegerInput(form.householdMembers);
    if (!form.name.trim() || !form.fatherName.trim() || householdMembers === null || householdMembers < 1) {
      toast.error('Name, father name, and valid household members are required');
      return;
    }

    setSubmitting(true);
    try {
      await muqtadisService.update(selectedMuqtadi.id, {
        name: form.name.trim(),
        fatherName: form.fatherName.trim(),
        householdMembers,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        phone: form.whatsappNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Household updated');
      setIsEditOpen(false);
      await actions.fetchItems();
      await refreshDetails(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update household'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedMuqtadi) return;

    const amount = parseStrictAmountInput(paymentAmount);
    if (!selectedCycleId || amount === null || amount <= 0) {
      toast.error('Month and valid amount are required');
      return;
    }

    if (!paymentUtr.trim()) {
      toast.error('Provide UTR or payment screenshot');
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMode === 'adjustment' && editingPaymentId) {
        await muqtadisService.updatePayment(editingPaymentId, {
          muqtadiId: selectedMuqtadi.id,
          cycleId: selectedCycleId,
          amount,
          method: paymentMethod,
          utr: paymentUtr.trim() || undefined,
          reference: paymentReference.trim() || undefined,
        });
      } else {
        await muqtadisService.recordPayment({
          muqtadiId: selectedMuqtadi.id,
          cycleId: selectedCycleId,
          amount,
          method: paymentMethod,
          utr: paymentUtr.trim() || undefined,
          reference: paymentReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        });
      }
      await invalidateMoneyQueries(queryClient);
      toast.success(paymentMode === 'adjustment' ? 'Payment adjustment recorded' : 'Payment recorded');
      setIsPaymentOpen(false);
      setEditingPaymentId(null);
      await actions.fetchItems();
      await fetchImamFundSummary();
      if (selectedDetails) {
        await refreshDetails(selectedMuqtadi.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to record payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async (transactionId: string) => {
    if (!selectedMuqtadi) return;

    setSubmitting(true);
    try {
      await muqtadisService.verifyPayment(transactionId);
      toast.success('Payment marked as verified');
      await invalidateMoneyQueries(queryClient);
      await actions.fetchItems();
      await fetchImamFundSummary();
      await refreshDetails(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPayment = async (transactionId: string) => {
    if (!selectedMuqtadi) return;

    setSubmitting(true);
    try {
      await muqtadisService.updatePayment(transactionId, { status: 'REJECTED' });
      toast.success('Payment marked as rejected');
      await invalidateMoneyQueries(queryClient);
      await actions.fetchItems();
      await fetchImamFundSummary();
      await refreshDetails(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject payment'));
    } finally {
      setSubmitting(false);
      setPendingPaymentRejectId(null);
    }
  };

  const handleDeletePayment = async (transactionId: string) => {
    if (!selectedMuqtadi) return;

    setSubmitting(true);
    try {
      await muqtadisService.deletePayment(transactionId);
      toast.success('Payment deleted');
      await invalidateMoneyQueries(queryClient);
      await actions.fetchItems();
      await fetchImamFundSummary();
      await refreshDetails(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete payment'));
    } finally {
      setSubmitting(false);
      setPendingPaymentDeleteId(null);
    }
  };

  const handleCreateInviteLink = async () => {
    const parsedLimit = parseStrictIntegerInput(inviteLimit);
    if (parsedLimit === null || parsedLimit < 1) {
      toast.error('Invite limit must be a whole number greater than or equal to 1');
      return;
    }

    setIsInviteLinkLoading(true);
    try {
      const response = await muqtadisService.createInvite({ maxUses: parsedLimit });
      setInviteLink(response.inviteUrl);
      setInviteUsageMeta({ maxUses: response.maxUses, usedCount: response.usedCount });
      setIsInviteLimitDialogOpen(false);
      setIsInviteLinkDialogOpen(true);
      toast.success('Invite link generated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate invite link'));
    } finally {
      setIsInviteLinkLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied');
    } catch {
      toast.error('Failed to copy invite link');
    }
  };

  const toggleStatus = async (item: Muqtadi, status: MuqtadiStatus) => {
    if (actionLoadingId === item.id) return;
    setActionLoadingId(item.id);
    try {
      if (status === 'DISABLED') {
        await muqtadisService.disable(item.id);
        toast.success('Household disabled');
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  isDisabled: true,
                  status: 'DISABLED',
                }
              : entry,
          ),
        );
        if (activeTab === 'trash') {
          await fetchTrashItems(trashPage);
        }
      } else {
        await muqtadisService.enable(item.id);
        toast.success('Household restored');
        const restoredItem = {
          ...item,
          isDisabled: false,
          status: 'ACTIVE' as const,
        };
        if (item.isVerified) {
          setItems((prev) =>
            prev.some((entry) => entry.id === item.id)
              ? prev.map((entry) =>
                  entry.id === item.id
                    ? {
                        ...entry,
                        isDisabled: false,
                        status: 'ACTIVE',
                      }
                    : entry,
                )
              : [restoredItem, ...prev],
          );
        }
        setTrashItems((prev) => prev.filter((entry) => entry.id !== item.id));
        await actions.fetchItems();
        await queryClient.invalidateQueries({ queryKey: ['muqtadis'], exact: false });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const sortedCycles = useMemo(() => {
    return [...cycles].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return filters.sortOrder === 'newest' ? right - left : left - right;
    });
  }, [cycles, filters.sortOrder]);

  const selectedPaymentDetail = useMemo(
    () => selectedDetails?.payments.find((entry) => entry.id === selectedPaymentDetailId) ?? null,
    [selectedDetails?.payments, selectedPaymentDetailId],
  );

  const primaryFilter = useMemo(() => {
    if (filters.statusFilter === 'disabled') return 'disabled';
    if (filters.verificationFilter === 'verified') return 'verified';
    if (filters.verificationFilter === 'pending') return 'pending';
    return 'all';
  }, [filters.statusFilter, filters.verificationFilter]);

  const applyPrimaryFilter = useCallback((value: 'all' | 'verified' | 'pending' | 'disabled') => {
    if (value === 'disabled') {
      setActiveTab('trash');
      setFilters.setStatusFilter('active');
      setFilters.setVerificationFilter('all');
      return;
    }

    if (activeTab === 'trash') {
      setActiveTab('active');
    }

    setFilters.setStatusFilter('active');
    if (value === 'verified') {
      setFilters.setVerificationFilter('verified');
      return;
    }
    if (value === 'pending') {
      setFilters.setVerificationFilter('pending');
      return;
    }
    setFilters.setVerificationFilter('all');
  }, [activeTab, setFilters]);

  const clearAllMuqtadiFilters = useCallback(() => {
    if (activeTab === 'trash') {
      setActiveTab('active');
    }
    setFilters.setSearch('');
    setFilters.setStatusFilter('active');
    setFilters.setVerificationFilter('all');
    setFilters.setAccountFilter('all');
    setFilters.setCycleFilter('all');
    setFilters.setPaymentFilter('all');
    setFilters.setSortOrder('newest');
    setFilters.setPage(1);
  }, [activeTab, setFilters]);

  return (
    <div className="ds-stack">
      <div className='mx-2'>
        <PageHeader title="Households" description="Manage imam salary households and dues">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Household</DialogTitle>
                  <DialogDescription>Create an offline household profile.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Father Name</Label><Input value={form.fatherName} onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Household Members</Label><Input type="text" inputMode="numeric" pattern="^\d+$" value={form.householdMembers} onChange={(e) => setForm((prev) => ({ ...prev, householdMembers: e.target.value, dependents: resizeDependents(e.target.value, prev.dependents) }))} /></div>
                  {form.dependents.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Dependents</Label>
                      <div className="space-y-2">
                        {form.dependents.map((dependentName, index) => (
                          <Input
                            key={`dependent-${index + 1}`}
                            placeholder={`Dependent ${index + 1} Name`}
                            value={dependentName}
                            onChange={(e) =>
                              setForm((prev) => {
                                const nextDependents = [...prev.dependents];
                                nextDependents[index] = e.target.value;
                                return { ...prev, dependents: nextDependents };
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2"><Label>WhatsApp Number</Label><Input value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button className="w-full sm:w-auto" onClick={handleAddMuqtadi} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <ActionOverflowMenu
              items={[
                {
                  label: isInviteLinkLoading ? 'Creating Invite...' : 'Invite',
                  onSelect: () => setIsInviteLimitDialogOpen(true),
                },
                { label: 'Salary Settings', onSelect: () => router.push('/dashboard/settings') },
                { label: 'Month', onSelect: () => router.push('/dashboard/imam-salary/cycles') },
              ]}
            />
          </div>
        </div>

      </PageHeader>
      </div>

      <MuqtadiStats stats={stats} imamFundSummary={imamFundSummary} isLoading={loading.isLoading} />

      <Card className="mx-2">
        <CardContent className="space-y-4 pt-4">
          {activeTab === 'active' ? (
            <MuqtadiFilters
              primaryFilter={primaryFilter}
              setPrimaryFilter={applyPrimaryFilter}
              search={filters.search}
              setSearch={(value: string) => {
                setFilters.setSearch(value);
                setFilters.setPage(1);
              }}
              accountFilter={filters.accountFilter}
              setAccountFilter={setFilters.setAccountFilter}
              cycleFilter={filters.cycleFilter}
              setCycleFilter={setFilters.setCycleFilter}
              paymentFilter={filters.paymentFilter}
              setPaymentFilter={setFilters.setPaymentFilter}
              sortOrder={filters.sortOrder}
              setSortOrder={setFilters.setSortOrder}
              clearFilters={clearAllMuqtadiFilters}
            />
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'trash')}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="trash">Trash</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <MuqtadiList
                isLoading={loading.isLoading}
                items={activeItems}
                accountFilter={filters.accountFilter}
                onAdd={() => setIsAddOpen(true)}
                resolvePaymentStatus={actions.resolvePaymentStatus}
                formatDate={formatDate}
                openEdit={openEdit}
                openPayment={openPayment}
                openCreateAccount={openCreateAccount}
                toggleStatus={toggleStatus}
                actionLoadingId={actionLoadingId}
                createAccountLoadingId={createAccountLoadingId}
                submitting={submitting}
                pendingVerificationId={loading.pendingVerificationId}
                handleVerifyMuqtadi={actions.verifyMuqtadi}
                handleRejectMuqtadi={actions.rejectMuqtadi}
                openPaymentDetails={openPaymentDetails}
              />
            </TabsContent>

            <TabsContent value="trash" className="mt-4 space-y-3">
              {isTrashLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading trash...
                </div>
              ) : trashItems.length === 0 ? (
                <ListEmptyState
                  title="Trash is empty"
                  description="Deleted households will appear here."
                  className="min-h-36"
                />
              ) : (
                trashItems.map((item) => (
                  <Card key={`trash-${item.id}`}>
                    <CardContent className="flex items-center justify-between gap-3 pt-4">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.whatsappNumber || item.email || '-'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStatus(item, 'ACTIVE')}
                        disabled={submitting || actionLoadingId === item.id}
                      >
                        {actionLoadingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Restore
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {activeTab === 'active'
                ? `Page ${filters.page} of ${filters.totalPages || 1}`
                : `Page ${trashPage} of ${trashTotalPages || 1}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'active') {
                    setFilters.setPage((current) => Math.max(current - 1, 1));
                    return;
                  }
                  setTrashPage((current) => Math.max(current - 1, 1));
                }}
                disabled={
                  activeTab === 'active'
                    ? filters.page <= 1 || loading.isLoading
                    : trashPage <= 1 || isTrashLoading
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'active') {
                    setFilters.setPage((current) => Math.min(current + 1, filters.totalPages || 1));
                    return;
                  }
                  setTrashPage((current) => Math.min(current + 1, trashTotalPages || 1));
                }}
                disabled={
                  activeTab === 'active'
                    ? filters.page >= (filters.totalPages || 1) || loading.isLoading
                    : trashPage >= (trashTotalPages || 1) || isTrashLoading
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Household</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Father Name</Label><Input value={form.fatherName} onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Household Members</Label><Input type="text" inputMode="numeric" pattern="^\d+$" value={form.householdMembers} onChange={(e) => setForm((prev) => ({ ...prev, householdMembers: e.target.value }))} /></div>
            <div className="space-y-2"><Label>WhatsApp Number</Label><Input value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleUpdateMuqtadi} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              Link an account to this offline household member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={createAccountForm.email}
                onChange={(e) => setCreateAccountForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={createAccountForm.password}
                onChange={(e) => setCreateAccountForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsCreateAccountOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleCreateAccount}
              disabled={submitting || createAccountLoadingId === createAccountTarget?.id}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{paymentMode === 'adjustment' ? 'Edit Payment (Adjustment)' : 'Record Payment'}</DialogTitle>
            <DialogDescription>
              {paymentMode === 'adjustment'
                ? 'This creates an adjustment transaction using existing backend payment APIs.'
                : 'Record a manual verified payment for the selected month.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <select className="w-full rounded-xl border bg-background px-3 py-2 text-sm" value={selectedCycleId} onChange={(e) => setSelectedCycleId(e.target.value)}>
                <option value="">Select month</option>
                {sortedCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>{`${formatCycleLabel(cycle.month, cycle.year)} (${getCycleStatus(cycle.month, cycle.year)}) - ${formatCurrency(cycle.ratePerPerson)} per person`}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2"><Label>Amount</Label><Input type="text" inputMode="decimal" pattern="^\d+(?:\.\d{1,2})?$" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select className="w-full rounded-xl border bg-background px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'UPI' | 'BANK')}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>UTR</Label>
              <Input value={paymentUtr} onChange={(e) => setPaymentUtr(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleRecordPayment} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {paymentMode === 'adjustment' ? 'Save Adjustment' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selectedDetails?.name || 'Muqtadi Details'}</SheetTitle>
            <SheetDescription>Overview, dues, payments and household history</SheetDescription>
          </SheetHeader>

          {!selectedDetails ? (
            <DrawerSkeleton />
          ) : (
            <Tabs defaultValue="overview" className="mt-4 ds-stack">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="dues">Dues</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <Card>
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedDetails.name}</p>
                    <p>
                      <span className="text-muted-foreground">Father Name:</span>{' '}
                      {selectedDetails.fatherName && selectedDetails.fatherName !== 'N/A' ? selectedDetails.fatherName : ''}
                    </p>
                    <p><span className="text-muted-foreground">WhatsApp:</span> {selectedDetails.whatsappNumber || '-'}</p>
                    <p><span className="text-muted-foreground">Household Members:</span> {selectedDetails.householdMembers}</p>
                    <p><span className="text-muted-foreground">Total Due:</span> {formatCurrency(selectedDetails.overview.totalDue)}</p>
                    <p><span className="text-muted-foreground">Total Paid:</span> {formatCurrency(selectedDetails.overview.totalPaid)}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dues" className="space-y-3">
                {selectedDetails.dues.length === 0 ? (
                  <ListEmptyState
                    title="No dues generated yet"
                    description="Start a salary month to generate dues for members."
                    actionLabel="Open Salary Months"
                    actionHref="/dashboard/imam-salary/cycles"
                    className="min-h-36"
                  />
                ) : (
                  selectedDetails.dues.map((due) => (
                    <Card key={due.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm">
                        <div>
                          <p className="font-medium">{formatCycleLabel(due.month, due.year)}</p>
                          <p className="text-muted-foreground">Expected {formatCurrency(due.expectedAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p>{formatCurrency(due.paidAmount)} paid</p>
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant={getCycleStatus(due.month, due.year) === 'Active' ? 'default' : 'secondary'}>{getCycleStatus(due.month, due.year)}</Badge>
                            <Badge variant={due.status === 'PAID' ? 'default' : 'secondary'}>{due.status}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-3">
                {selectedDetails.payments.length === 0 ? (
                  <ListEmptyState
                    title="No payment records yet"
                    description="Record the first payment to start this history."
                    actionLabel="Record Payment"
                    onAction={() => {
                      if (selectedMuqtadi) {
                        openPayment(selectedMuqtadi);
                      }
                    }}
                    className="min-h-36"
                  />
                ) : (
                  selectedDetails.payments.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="space-y-2 pt-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
                          <Badge
                            className={
                              (entry.details?.status as string) === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : (entry.details?.status as string) === 'REJECTED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {(entry.details?.status as string) || '-'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p>{formatCurrency(Number(entry.details?.amount || 0))} • {(entry.details?.method as string) || '-'}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPaymentDetailId(entry.id);
                              setPaymentDetailImageFailed(false);
                            }}
                          >
                            View Payment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-3">
                {selectedDetails.history.length === 0 ? (
                  <ListEmptyState
                    title="No history entries"
                    description="Profile and payment updates will be listed here."
                    actionLabel="Back to Overview"
                    onAction={() => setIsDrawerOpen(false)}
                    className="min-h-36"
                  />
                ) : (
                  selectedDetails.history.map((entry) => (
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

      <Dialog open={isInviteLinkDialogOpen} onOpenChange={setIsInviteLinkDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Muqtadi</DialogTitle>
            <DialogDescription>
              Share this secure link so a muqtadi can join using the invite token.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Invite Link</p>
            <Input value={inviteLink} readOnly />
            {typeof inviteUsageMeta.maxUses === 'number' ? (
              <p className="text-xs text-muted-foreground">
                Uses left: {Math.max((inviteUsageMeta.maxUses ?? 0) - (inviteUsageMeta.usedCount ?? 0), 0)} / {inviteUsageMeta.maxUses}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={handleCopyInviteLink} disabled={!inviteLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteLimitDialogOpen} onOpenChange={setIsInviteLimitDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Muqtadi</DialogTitle>
            <DialogDescription>
              Set how many times this invite link can be used.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-limit">Usage limit</Label>
            <Input
              id="invite-limit"
              type="text"
              inputMode="numeric"
              pattern="^\d+$"
              min={1}
              step={1}
              value={inviteLimit}
              onChange={(e) => setInviteLimit(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsInviteLimitDialogOpen(false)} disabled={isInviteLinkLoading}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleCreateInviteLink} disabled={isInviteLinkLoading}>
              {isInviteLinkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingPaymentVerificationId)}
        onOpenChange={(open) => !open && setPendingPaymentVerificationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This payment will be marked as verified and reflected in dues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingPaymentVerificationId) return;
                handleVerifyPayment(pendingPaymentVerificationId);
                setPendingPaymentVerificationId(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingPaymentDeleteId)}
        onOpenChange={(open) => !open && setPendingPaymentDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment and its linked imam fund income entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={() => {
                if (!pendingPaymentDeleteId) return;
                handleDeletePayment(pendingPaymentDeleteId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingPaymentRejectId)}
        onOpenChange={(open) => !open && setPendingPaymentRejectId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This keeps the transaction in history and marks it as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={() => {
                if (!pendingPaymentRejectId) return;
                handleRejectPayment(pendingPaymentRejectId);
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(selectedPaymentDetail)} onOpenChange={(open) => !open && setSelectedPaymentDetailId(null)}>
        <DialogContent className="h-[92dvh] w-[96vw] max-w-none overflow-y-auto p-0 sm:h-auto sm:max-w-2xl">
          {selectedPaymentDetail ? (
            <div className="flex h-full flex-col">
              <DialogHeader className="border-b px-4 py-3 sm:px-6">
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>Payment Details</span>
                  <Badge
                    className={
                      (selectedPaymentDetail.details?.status as string) === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : (selectedPaymentDetail.details?.status as string) === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }
                  >
                    {(selectedPaymentDetail.details?.status as string) || '-'}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedDetails?.name || 'Muqtadi'} • {selectedPaymentDetail.details?.month && selectedPaymentDetail.details?.year
                    ? formatCycleLabel(Number(selectedPaymentDetail.details.month), Number(selectedPaymentDetail.details.year))
                    : 'Cycle unavailable'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-4 px-4 py-4 sm:px-6">
                <Card>
                  <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Amount paid:</span> {formatCurrency(Number(selectedPaymentDetail.details?.amount || 0))}</p>
                    <p><span className="text-muted-foreground">Outstanding:</span> {formatCurrency(selectedDetails?.overview.outstandingAmount ?? 0)}</p>
                    <p><span className="text-muted-foreground">Submitted at:</span> {formatDate(selectedPaymentDetail.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
                    <p><span className="text-muted-foreground">Method:</span> {String(selectedPaymentDetail.details?.method || '-')}</p>
                    <p><span className="text-muted-foreground">Household size:</span> {selectedDetails?.householdMembers ?? '-'}</p>
                    <p><span className="text-muted-foreground">UTR:</span> {String(selectedPaymentDetail.details?.utr || '-')}</p>
                    <p className="sm:col-span-2"><span className="text-muted-foreground">Reference:</span> {String(selectedPaymentDetail.details?.reference || '-')}</p>
                    <p className="sm:col-span-2"><span className="text-muted-foreground">Rejection reason:</span> {(selectedPaymentDetail.details as any)?.rejectionReason || '-'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-2 pt-4">
                    <p className="text-sm font-medium">Payment Proof</p>
                    {selectedPaymentDetail.details?.screenshotUrl ? (
                      <>
                        {!paymentDetailImageFailed ? (
                          <img
                            src={String(selectedPaymentDetail.details.screenshotUrl)}
                            alt="Payment proof"
                            className="max-h-96 w-full rounded-lg border object-contain"
                            onError={() => setPaymentDetailImageFailed(true)}
                          />
                        ) : (
                          <div className="flex min-h-40 items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground">
                            <ImageOff className="mr-2 h-4 w-4" />
                            Failed to load image preview
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            const proofUrl = String(selectedPaymentDetail.details?.screenshotUrl || '');
                            if (!proofUrl) return;
                            window.open(proofUrl, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Full Image
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No screenshot uploaded for this payment.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="sticky bottom-0 border-t bg-background px-4 py-3 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  {(selectedPaymentDetail.details?.status as string) === 'PENDING' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => setPendingPaymentVerificationId(selectedPaymentDetail.id)}
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={submitting}
                        onClick={() => setPendingPaymentRejectId(selectedPaymentDetail.id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => selectedMuqtadi && openPaymentAdjustment(selectedMuqtadi, selectedPaymentDetail)}
                  >
                    Edit Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setPendingPaymentDeleteId(selectedPaymentDetail.id)}
                  >
                    Delete Payment
                  </Button>
                  {selectedPaymentDetail.details?.utr ? (
                    <Button size="sm" variant="ghost" onClick={() => handleCopyUtr(String(selectedPaymentDetail.details?.utr))}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy UTR
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
