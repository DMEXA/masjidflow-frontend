'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { invalidateMoneyQueries, invalidateMuqtadiMutationQueries } from '@/lib/money-cache';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatDate, formatCycleLabel, getCycleStatus } from '@/src/utils/format';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MuqtadiStats from '@/components/muqtadis/MuqtadiStats';
import MuqtadiFilters from '@/components/muqtadis/MuqtadiFilters';
import MuqtadiList from '@/components/muqtadis/MuqtadiList';
import MuqtadiDetailsModal from '@/components/muqtadis/MuqtadiDetailsModal';
import {
  useMuqtadis,
} from '@/hooks/useMuqtadis';
import { parseStrictAmountInput, parseStrictIntegerInput } from '@/src/utils/numeric-input';
import { isValidIndianPhone, normalizeIndianPhone } from '@/src/utils/phone';

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
  const [trashItems, setTrashItems] = useState<Muqtadi[]>([]);
  const [trashPage, setTrashPage] = useState(1);
  const [trashTotalPages, setTrashTotalPages] = useState(1);
  const [isTrashLoading, setIsTrashLoading] = useState(false);

  const [selectedMuqtadi, setSelectedMuqtadi] = useState<Muqtadi | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<MuqtadiDetails | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cycles, setCycles] = useState<ImamSalaryCycle[]>([]);
  const [paymentMode, setPaymentMode] = useState<'new' | 'adjustment'>('new');
  const [pendingPaymentVerificationId, setPendingPaymentVerificationId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pendingPaymentDeleteId, setPendingPaymentDeleteId] = useState<string | null>(null);
  const [pendingPaymentRejectId, setPendingPaymentRejectId] = useState<string | null>(null);
  const [selectedPaymentDetailId, setSelectedPaymentDetailId] = useState<string | null>(null);
  const [paymentDetailImageFailed, setPaymentDetailImageFailed] = useState(false);
  const [isIncludingInCycle, setIsIncludingInCycle] = useState(false);
  const [isRemovingFromCycle, setIsRemovingFromCycle] = useState(false);
  const [isGeneratingLoginLink, setIsGeneratingLoginLink] = useState(false);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [authLinksByMuqtadiId, setAuthLinksByMuqtadiId] = useState<
    Record<string, { link: string; expiresInMinutes: number; createdAt: string; mode: 'login' | 'reset' }>
  >({});
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

  const buildPreviewDetails = useCallback((item: Muqtadi): MuqtadiDetails => ({
    id: item.id,
    userId: item.userId ?? null,
    accountState: item.accountState ?? 'OFFLINE',
    setupLinkExpiresAt: item.setupLinkExpiresAt ?? null,
    setupLinkExpiresInMinutes: item.setupLinkExpiresInMinutes ?? null,
    name: item.name,
    fatherName: item.fatherName ?? '',
    email: item.email ?? null,
    householdMembers: item.householdMembers ?? 1,
    memberNames: Array.isArray(item.memberNames) ? item.memberNames : [item.name].filter(Boolean),
    whatsappNumber: item.whatsappNumber ?? null,
    isVerified: item.isVerified ?? false,
    category: item.category ?? null,
    phone: item.phone ?? null,
    notes: item.notes ?? null,
    status: item.status ?? 'ACTIVE',
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
  }), []);

  const patchDetailCache = useCallback((id: string, updater: (old: MuqtadiDetails | undefined) => MuqtadiDetails | undefined) => {
    const queryKey = queryKeys.muqtadiDetail(id);
    queryClient.setQueryData(queryKey, (old: MuqtadiDetails | undefined) => updater(old));
    setSelectedDetails((old) => (old?.id === id ? updater(old) ?? old : old));
  }, [queryClient]);

  const invalidateDetailQueries = useCallback(async (id: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDetail(id), exact: true }),
      queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiPayments(id), exact: true }),
      queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiHistory(id), exact: true }),
    ]);
  }, [queryClient]);

  const getCurrentCycleDueFromDetails = useCallback((details: MuqtadiDetails | null | undefined) => {
    if (!details?.dues?.length) return null;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return details.dues.find((due) => due.month === currentMonth && due.year === currentYear) ?? null;
  }, []);

  const dependentMutation = useMutation({
    mutationFn: async ({
      muqtadiId,
      memberNames,
      householdMembers,
    }: {
      muqtadiId: string;
      memberNames: string[];
      householdMembers: number;
    }) => {
      await muqtadisService.update(muqtadiId, {
        householdMembers,
        memberNames,
      });
      return muqtadisService.getById(muqtadiId);
    },
    onMutate: async ({ muqtadiId, memberNames, householdMembers }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.muqtadiDetail(muqtadiId), exact: true }),
        queryClient.cancelQueries({ queryKey: queryKeys.muqtadiDetailDues(muqtadiId), exact: true }),
      ]);

      const previousDetail = queryClient.getQueryData<MuqtadiDetails>(queryKeys.muqtadiDetail(muqtadiId));
      const previousDues = queryClient.getQueryData<MuqtadiDetails['dues']>(queryKeys.muqtadiDetailDues(muqtadiId));
      const previousItems = items;

      queryClient.setQueryData(queryKeys.muqtadiDetail(muqtadiId), (old: MuqtadiDetails | undefined) => {
        if (!old) return old;
        return {
          ...old,
          memberNames,
          householdMembers,
        };
      });

      setSelectedDetails((old) => {
        if (!old || old.id !== muqtadiId) return old;
        return {
          ...old,
          memberNames,
          householdMembers,
        };
      });

      setItems((prev) => prev.map((entry) => (
        entry.id === muqtadiId
          ? {
              ...entry,
              memberNames,
              householdMembers,
            }
          : entry
      )));

      return { previousDetail, previousDues, previousItems, muqtadiId };
    },
    onError: (_error, _variables, context) => {
      if (context?.muqtadiId) {
        queryClient.setQueryData(queryKeys.muqtadiDetail(context.muqtadiId), context.previousDetail);
        queryClient.setQueryData(queryKeys.muqtadiDetailDues(context.muqtadiId), context.previousDues ?? []);
      }
      if (context?.previousItems) {
        setItems(context.previousItems);
      }
      const previousDetail = context?.previousDetail ?? null;
      if (previousDetail) {
        setSelectedDetails((old) => {
          if (!old || old.id !== previousDetail.id) {
            return old;
          }
          return previousDetail;
        });
      }
      toast.error('Failed to update household. Please try again.');
    },
    onSuccess: (updatedDetail, variables) => {
      queryClient.setQueryData(queryKeys.muqtadiDetail(variables.muqtadiId), updatedDetail);
      queryClient.setQueryData(queryKeys.muqtadiDetailDues(variables.muqtadiId), updatedDetail.dues ?? []);
      setSelectedDetails((old) => (old?.id === variables.muqtadiId ? updatedDetail : old));

      const currentDue = getCurrentCycleDueFromDetails(updatedDetail);
      setItems((prev) => prev.map((entry) => (
        entry.id === variables.muqtadiId
          ? {
              ...entry,
              memberNames: updatedDetail.memberNames,
              householdMembers: updatedDetail.householdMembers,
              expectedAmount: Number(currentDue?.expectedAmount ?? entry.expectedAmount ?? 0),
              paidAmount: Number(currentDue?.paidAmount ?? entry.paidAmount ?? 0),
              creditAmount: Number(currentDue?.creditAmount ?? entry.creditAmount ?? 0),
              remainingAmount: Number(currentDue?.remainingAmount ?? entry.remainingAmount ?? 0),
            }
          : entry
      )));
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDetail(variables.muqtadiId), exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDetailDues(variables.muqtadiId), exact: true }),
      ]);
    },
  });

  const isUpdatingDependents = dependentMutation.isPending;

  const {
    items,
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

  const openAddDialog = useCallback(() => {
    setIsAddOpen(true);
  }, []);

  const openEdit = useCallback((item: Muqtadi) => {
    const memberNames = Array.isArray(item.memberNames)
      ? item.memberNames.map((name) => String(name ?? '').trim()).filter(Boolean)
      : [];
    const resolvedHouseholdMembers = item.householdMembers ?? Math.max(memberNames.length, 1);
    const dependentsFromMemberNames = memberNames.length > 0
      ? memberNames.slice(1)
      : resizeDependents(String(resolvedHouseholdMembers), []);

    setSelectedMuqtadi(item);
    setForm({
      name: item.name,
      fatherName: item.fatherName,
      householdMembers: String(resolvedHouseholdMembers),
      dependents: resizeDependents(String(resolvedHouseholdMembers), dependentsFromMemberNames),
      whatsappNumber: item.whatsappNumber || '',
      notes: item.notes || '',
    });
    setIsEditOpen(true);
  }, []);

  const openPayment = useCallback((item: Muqtadi) => {
    setSelectedMuqtadi(item);
    setPaymentMode('new');
    setEditingPaymentId(null);
    setSelectedCycleId(cycles[0]?.id || '');
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentUtr('');
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentOpen(true);
  }, [cycles]);

  const openPaymentDetails = useCallback((item: Muqtadi) => {
    const cached = queryClient.getQueryData<MuqtadiDetails>(queryKeys.muqtadiDetail(item.id));
    setSelectedMuqtadi(item);
    setSelectedDetails(cached ?? buildPreviewDetails(item));
    setSelectedPaymentDetailId(null);
    setPaymentDetailImageFailed(false);
    setIsDrawerOpen(true);
  }, [buildPreviewDetails, queryClient]);

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

    const optimisticId = `optimistic-muqtadi-${Date.now()}`;
    const previousItems = items;

    setSubmitting(true);
    setItems((prev) => [
      {
        id: optimisticId,
        name: form.name.trim(),
        fatherName: form.fatherName.trim(),
        householdMembers,
        memberNames: [form.name.trim(), ...dependents],
        dependents,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        phone: form.whatsappNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: 'ACTIVE',
        isDisabled: false,
        isVerified: false,
        createdAt: new Date().toISOString(),
      } as Muqtadi,
      ...prev,
    ]);

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
      await invalidateMuqtadiMutationQueries(queryClient);
    } catch (error) {
      setItems(previousItems);
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
      await invalidateMuqtadiMutationQueries(queryClient);
      setSubmitting(false);
    }
  };

  const handleUpdateMuqtadi = async () => {
    if (!selectedMuqtadi) return;

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
      await muqtadisService.update(selectedMuqtadi.id, {
        name: form.name.trim(),
        fatherName: form.fatherName.trim(),
        householdMembers,
        memberNames: [form.name.trim(), ...dependents],
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        phone: form.whatsappNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Household updated');
      setIsEditOpen(false);
      await actions.fetchItems();
      await invalidateDetailQueries(selectedMuqtadi.id);
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
      patchDetailCache(selectedMuqtadi.id, (old) => {
        if (!old) return old;
        const optimisticEntry = {
          id: editingPaymentId ?? `optimistic-payment-${Date.now()}`,
          action: paymentMode === 'adjustment' ? 'PAYMENT_ADJUSTED' : 'PAYMENT_RECORDED',
          createdAt: new Date().toISOString(),
          details: {
            amount,
            method: paymentMethod,
            cycleId: selectedCycleId,
            status: 'PENDING',
            utr: paymentUtr.trim() || undefined,
            reference: paymentReference.trim() || undefined,
          },
        };
        return {
          ...old,
          payments: [optimisticEntry, ...(old.payments ?? [])],
        };
      });
      queryClient.setQueryData(queryKeys.muqtadiPayments(selectedMuqtadi.id), (old: MuqtadiDetails['payments'] | undefined) => {
        const optimisticEntry = {
          id: editingPaymentId ?? `optimistic-payment-${Date.now()}`,
          action: paymentMode === 'adjustment' ? 'PAYMENT_ADJUSTED' : 'PAYMENT_RECORDED',
          createdAt: new Date().toISOString(),
          details: {
            amount,
            method: paymentMethod,
            cycleId: selectedCycleId,
            status: 'PENDING',
            utr: paymentUtr.trim() || undefined,
            reference: paymentReference.trim() || undefined,
          },
        };
        return [optimisticEntry, ...(old ?? [])];
      });
      await actions.fetchItems();
      await fetchImamFundSummary();
      await invalidateDetailQueries(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to record payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDependent = async (name: string) => {
    if (!selectedDetails) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Dependent name is required');
      return;
    }

    const confirmed = window.confirm('Are you sure? This will update current dues for this household.');
    if (!confirmed) return;

    const currentMembers = Array.isArray(selectedDetails.memberNames) && selectedDetails.memberNames.length > 0
      ? selectedDetails.memberNames.filter((entry) => Boolean(String(entry || '').trim()))
      : [selectedDetails.name].filter(Boolean);
    const nextMembers = [...currentMembers, trimmed];

    try {
      await dependentMutation.mutateAsync({
        muqtadiId: selectedDetails.id,
        householdMembers: nextMembers.length,
        memberNames: nextMembers,
      });
      toast.success('Dependent added');
    } catch {
      // Error toast handled in mutation onError.
    }
  };

  const handleRemoveDependent = async (index: number) => {
    if (!selectedDetails) return;

    const currentMembers = Array.isArray(selectedDetails.memberNames) && selectedDetails.memberNames.length > 0
      ? selectedDetails.memberNames.filter((entry) => Boolean(String(entry || '').trim()))
      : [selectedDetails.name].filter(Boolean);

    if (currentMembers.length <= 1) {
      toast.error('At least one household member is required');
      return;
    }

    const nextMembers = currentMembers.filter((_, memberIndex) => memberIndex !== index);
    if (nextMembers.length === 0) {
      toast.error('At least one household member is required');
      return;
    }

    const confirmed = window.confirm('Are you sure? This will update current dues for this household.');
    if (!confirmed) return;

    try {
      await dependentMutation.mutateAsync({
        muqtadiId: selectedDetails.id,
        householdMembers: nextMembers.length,
        memberNames: nextMembers,
      });
      toast.success('Dependent removed');
    } catch {
      // Error toast handled in mutation onError.
    }
  };

  const handleIncludeInCycle = async () => {
    if (!selectedDetails) return;

    setIsIncludingInCycle(true);
    try {
      const result = await muqtadisService.includeInCurrentCycle(selectedDetails.id);
      if (result.alreadyIncluded) {
        toast.success('Household is already included in current cycle');
      } else {
        toast.success('Household included in current cycle');
      }
      await actions.fetchItems();
      await invalidateDetailQueries(selectedDetails.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to include household in current cycle'));
    } finally {
      setIsIncludingInCycle(false);
    }
  };

  const handleRemoveFromCycle = async () => {
    if (!selectedDetails) return;

    setIsRemovingFromCycle(true);
    try {
      const result = await muqtadisService.removeFromCurrentCycle(selectedDetails.id);
      if (result.notFound) {
        toast.success('Household is not included in current cycle');
      } else if (result.removed) {
        toast.success('Household removed from current cycle');
      }
      await actions.fetchItems();
      await invalidateDetailQueries(selectedDetails.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to remove household from current cycle'));
    } finally {
      setIsRemovingFromCycle(false);
    }
  };

  const handleGenerateLoginLink = async () => {
    if (!selectedDetails) return;
    const accountState = selectedDetails.accountState || 'OFFLINE';
    if (accountState === 'ACTIVE') {
      toast.error('Active accounts cannot generate login links. Use reset password instead.');
      return;
    }

    const phone = selectedDetails.phone || selectedDetails.whatsappNumber;
    if (!phone || !isValidIndianPhone(phone)) {
      toast.error('Valid phone is required to generate login link');
      return;
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      toast.error('Valid phone is required to generate login link');
      return;
    }

    const confirmed = window.confirm(`Generate secure login link for ${normalizedPhone}?`);
    if (!confirmed) return;

    setIsGeneratingLoginLink(true);
    try {
      const result = await muqtadisService.enableLogin(selectedDetails.id, {
        phone: normalizedPhone,
      });

      setAuthLinksByMuqtadiId((prev) => ({
        ...prev,
        [selectedDetails.id]: {
          link: result.resetLink,
          expiresInMinutes: result.expiresInMinutes,
          createdAt: new Date().toISOString(),
          mode: 'login',
        },
      }));
      toast.success('Login link generated');
      await actions.fetchItems();
      await invalidateDetailQueries(selectedDetails.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate login link'));
    } finally {
      setIsGeneratingLoginLink(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!selectedDetails) return;

    const accountState = selectedDetails.accountState || 'OFFLINE';
    if (accountState !== 'ACTIVE') {
      toast.error('Reset password is only available for active accounts');
      return;
    }

    setIsSendingResetLink(true);
    try {
      const response = await muqtadisService.generateResetPasswordLink(selectedDetails.id);
      setAuthLinksByMuqtadiId((prev) => ({
        ...prev,
        [selectedDetails.id]: {
          link: response.resetLink,
          expiresInMinutes: response.expiresInMinutes,
          createdAt: new Date().toISOString(),
          mode: 'reset',
        },
      }));
      toast.success('Admin reset link generated');
      await actions.fetchItems();
      await invalidateDetailQueries(selectedDetails.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate admin reset link'));
    } finally {
      setIsSendingResetLink(false);
    }
  };

  const handleCopyAuthLink = async () => {
    if (!selectedDetails) return;
    const value = authLinksByMuqtadiId[selectedDetails.id]?.link;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleVerifyPendingHousehold = async () => {
    if (!selectedMuqtadi || loading.pendingVerificationId) return;

    try {
      await actions.verifyMuqtadi(selectedMuqtadi);
      await invalidateDetailQueries(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify household'));
    }
  };

  const handleRejectPendingHousehold = async () => {
    if (!selectedMuqtadi || loading.pendingVerificationId) return;

    try {
      await actions.rejectMuqtadi(selectedMuqtadi);
      await invalidateDetailQueries(selectedMuqtadi.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update household verification'));
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
      await invalidateDetailQueries(selectedMuqtadi.id);
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
      await invalidateDetailQueries(selectedMuqtadi.id);
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
      await invalidateDetailQueries(selectedMuqtadi.id);
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

  const toggleStatus = useCallback(async (item: Muqtadi, status: MuqtadiStatus) => {
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
        await invalidateMuqtadiMutationQueries(queryClient);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    } finally {
      setActionLoadingId(null);
    }
  }, [
    actionLoadingId,
    actions,
    activeTab,
    fetchTrashItems,
    queryClient,
    setItems,
    trashPage,
  ]);

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
    <div className="ds-section ds-stack">
      <PageHeader title="Households" description="Manage imam salary households and dues">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className=''>
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

            <Button
              type="button"
              variant="secondary"
              className="bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 transition-colors px-8"
              onClick={() => setIsInviteLimitDialogOpen(true)}
              disabled={isInviteLinkLoading}
            >
              Invite
            </Button>
          </div>
        </div>

      </PageHeader>

      <MuqtadiStats stats={stats} imamFundSummary={imamFundSummary} isLoading={loading.isLoading} />

      <div className="space-y-4">
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
              onAdd={openAddDialog}
              resolvePaymentStatus={actions.resolvePaymentStatus}
              formatDate={formatDate}
              openEdit={openEdit}
              openPayment={openPayment}
              openCreateAccount={() => {}}
              toggleStatus={toggleStatus}
              actionLoadingId={actionLoadingId}
              createAccountLoadingId={null}
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
                      <p className="text-xs text-muted-foreground">{item.phone || item.whatsappNumber || item.email || '-'}</p>
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
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Household</DialogTitle></DialogHeader>
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
                      key={`edit-dependent-${index + 1}`}
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
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleUpdateMuqtadi} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button>
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

      <MuqtadiDetailsModal
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        details={selectedDetails}
        selectedMuqtadi={selectedMuqtadi}
        onDetailsChange={setSelectedDetails}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        formatCycleLabel={formatCycleLabel}
        getCycleStatus={getCycleStatus}
        onOpenRecordPayment={() => {
          if (selectedMuqtadi) {
            openPayment(selectedMuqtadi);
          }
        }}
        onOpenEditDetails={() => {
          if (selectedMuqtadi) {
            openEdit(selectedMuqtadi);
          }
        }}
        onVerifyPending={handleVerifyPendingHousehold}
        onRejectPending={handleRejectPendingHousehold}
        onOpenCreateCycle={() => router.push('/dashboard/imam-salary/cycles')}
        onOpenPaymentDetail={(paymentId: string) => {
          setSelectedPaymentDetailId(paymentId);
          setPaymentDetailImageFailed(false);
        }}
        onAddDependent={handleAddDependent}
        onRemoveDependent={handleRemoveDependent}
        onIncludeInCycle={handleIncludeInCycle}
        onRemoveFromCycle={handleRemoveFromCycle}
        onGenerateLoginLink={handleGenerateLoginLink}
        onSendResetLink={handleSendResetLink}
        onCopyAuthLink={handleCopyAuthLink}
        isUpdatingDependents={isUpdatingDependents}
        isIncludingInCycle={isIncludingInCycle}
        isRemovingFromCycle={isRemovingFromCycle}
        isGeneratingLoginLink={isGeneratingLoginLink}
        isSendingResetLink={isSendingResetLink}
        isPendingActionLoading={Boolean(loading.pendingVerificationId)}
        authLinkState={selectedDetails ? authLinksByMuqtadiId[selectedDetails.id] ?? null : null}
      />

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
