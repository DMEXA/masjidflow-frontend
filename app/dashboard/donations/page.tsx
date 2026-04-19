'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency, formatDate, formatPaymentType } from '@/src/utils/format';
import { donationsService } from '@/services/donations.service';
import { Download, Loader2, SlidersHorizontal, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import type { Donation } from '@/types';
import { PAYMENT_TYPES } from '@/src/constants';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSafeLimit } from '@/src/utils/pagination';
import { collectPaginatedExportRows, downloadPdfExport, EXPORT_MAX_ROWS } from '@/src/utils/export';
import { useFundsListQuery } from '@/hooks/useFundsListQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { invalidateDonationMutationQueries, invalidateMoneyQueries } from '@/lib/money-cache';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { API_BASE_URL } from '@/src/constants';

function resolveReceiptUrl(receipt: string, baseOrigin: string): string | null {
  const raw = receipt.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^https?\/\//i.test(raw)) {
    return raw.replace(/^https?\/\//i, (match) =>
      match.toLowerCase().startsWith('https') ? 'https://' : 'http://',
    );
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  if (raw.startsWith('/')) {
    return `${baseOrigin}${raw}`;
  }

  return `${baseOrigin}/${raw}`;
}

export default function DonationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { mosque, token, user } = useAuthStore();
  const mosqueId = mosque?.id;
  const { canManageDonations, canDelete, isAdmin, isSuperAdmin, isTreasurer } = usePermission();
  const {
    canCreate: canCreateAction,
    canEdit: canEditAction,
    canDelete: canDeleteAction,
  } = usePermission(user?.role);
  const canViewPendingCount = isAdmin || isSuperAdmin;

  const [searchQuery, setSearchQuery] = useState('');
  const [donationStatusFilter, setDonationStatusFilter] = useState<'all' | 'VERIFIED' | 'PENDING'>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [fundTypeFilter, setFundTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<'all' | 'VERIFIED' | 'PENDING'>('all');
  const [pendingPaymentTypeFilter, setPendingPaymentTypeFilter] = useState<string>('all');
  const [receiptModalDonation, setReceiptModalDonation] = useState<Donation | null>(null);
  const [receiptContentLoaded, setReceiptContentLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [limit] = useState(() => getSafeLimit(20));
  const debouncedSearch = useDebounce(searchQuery);
  const apiBaseUrl = API_BASE_URL ?? '';
  const apiOrigin = apiBaseUrl.replace('/api/v1', '');

  const fundsQuery = useFundsListQuery(mosqueId);

  const funds = useMemo(() => fundsQuery.data ?? [], [fundsQuery.data]);

  const selectedFundId = useMemo(() => {
    if (fundTypeFilter === 'all') return undefined;
    const matched = funds.find((fund) => fund.type === fundTypeFilter);
    return matched?.id ?? '__missing_fund__';
  }, [fundTypeFilter, funds]);

  const donationsQuery = useQuery({
    queryKey: queryKeys.donations(mosqueId, {
      page,
      limit,
      status: donationStatusFilter,
      paymentType: paymentTypeFilter,
      fundType: fundTypeFilter,
      search: debouncedSearch,
    }),
    queryFn: () =>
      donationsService.getAll({
        page,
        limit,
        donationStatus: donationStatusFilter !== 'all' ? donationStatusFilter : undefined,
        paymentType: paymentTypeFilter !== 'all' ? (paymentTypeFilter as any) : undefined,
        fundId: selectedFundId,
        search: debouncedSearch || undefined,
      }),
    enabled: Boolean(mosqueId) && Boolean(token),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!mosqueId || !token) return;
    if (!donationsQuery.data) return;

    const totalPages = donationsQuery.data.totalPages ?? 1;
    if (page >= totalPages) return;

    const nextPage = page + 1;
    const nextQueryKey = queryKeys.donations(mosqueId, {
      page: nextPage,
      limit,
      status: donationStatusFilter,
      paymentType: paymentTypeFilter,
      fundType: fundTypeFilter,
      search: debouncedSearch,
    });

    if (queryClient.getQueryData(nextQueryKey)) return;

    void queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () =>
        donationsService.getAll({
          page: nextPage,
          limit,
          donationStatus: donationStatusFilter !== 'all' ? donationStatusFilter : undefined,
          paymentType: paymentTypeFilter !== 'all' ? (paymentTypeFilter as any) : undefined,
          fundId: selectedFundId,
          search: debouncedSearch || undefined,
        }),
      staleTime: 30_000,
    });
  }, [
    mosqueId,
    token,
    donationsQuery.data,
    page,
    limit,
    donationStatusFilter,
    paymentTypeFilter,
    fundTypeFilter,
    debouncedSearch,
    selectedFundId,
    queryClient,
  ]);

  const pendingCountQuery = useQuery({
    queryKey: queryKeys.donationsPendingCount(mosqueId),
    queryFn: () => donationsService.getPendingCount(),
    enabled: false,
    staleTime: 30_000,
    refetchOnMount: false,
    initialData: () =>
      queryClient.getQueryData<{ count: number }>(queryKeys.donationsPendingCount(mosqueId)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => donationsService.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.donationsRoot(mosqueId), exact: false });
      const queryKey = queryKeys.donations(mosqueId, {
        page,
        limit,
        status: donationStatusFilter,
        paymentType: paymentTypeFilter,
        fundType: fundTypeFilter,
        search: debouncedSearch,
      });
      const snapshot = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (prev: any) => {
        if (!prev || !Array.isArray(prev.data)) return prev;
        return {
          ...prev,
          data: prev.data.filter((item: Donation) => item.id !== id),
        };
      });

      return { snapshot, queryKey };
    },
    onError: (_error, _id, context) => {
      if (context?.snapshot && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.snapshot);
      }
    },
    onSuccess: async () => {
      await invalidateDonationMutationQueries(queryClient, mosqueId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.funds(mosqueId), exact: false });
      await invalidateMoneyQueries(queryClient);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => donationsService.approvePending(id),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => donationsService.rejectPending(id),
  });

  useEffect(() => {
    const status = (searchParams.get('status') || '').toLowerCase();
    if (status === 'verified') {
      setDonationStatusFilter('VERIFIED');
      setPendingStatusFilter('VERIFIED');
      return;
    }
    if (status === 'pending') {
      setDonationStatusFilter('PENDING');
      setPendingStatusFilter('PENDING');
      return;
    }
    setDonationStatusFilter('all');
    setPendingStatusFilter('all');
  }, [searchParams]);

  useEffect(() => {
    setPendingStatusFilter(donationStatusFilter);
  }, [donationStatusFilter]);

  useEffect(() => {
    setPendingPaymentTypeFilter(paymentTypeFilter);
  }, [paymentTypeFilter]);

  useEffect(() => {
    if (donationsQuery.error) {
      toast.error(getErrorMessage(donationsQuery.error, 'Failed to load donations'));
    }
  }, [donationsQuery.error]);

  const handleDelete = async (id: string) => {
    if (!canDeleteAction || !canDelete) return;
    if (loadingId || deleteMutation.isPending) return;
    setLoadingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Donation deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete donation'));
    } finally {
      setLoadingId(null);
    }
  };

  const invalidateDonationQueries = async () => {
    await invalidateDonationMutationQueries(queryClient, mosqueId);
  };

  const handleApprove = async (id: string) => {
    if (!canEditAction) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Donation approved');
      await invalidateDonationQueries();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve donation'));
    }
  };

  const handleReject = async (id: string) => {
    if (!canEditAction) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success('Donation rejected');
      await invalidateDonationQueries();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject donation'));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (!canEditAction) return;

    const targetIds = donations
      .filter((item) => selectedIds.includes(item.id) && item.donationStatus === 'PENDING')
      .map((item) => item.id);

    if (targetIds.length === 0) {
      toast.error('Select at least one pending donation');
      return;
    }

    setBulkActionLoading(action);
    try {
      if (action === 'approve') {
        await Promise.allSettled(targetIds.map((id) => donationsService.approvePending(id)));
      } else {
        await Promise.allSettled(targetIds.map((id) => donationsService.rejectPending(id)));
      }
      setSelectedIds([]);
      toast.success(`Bulk ${action} completed`);
      await invalidateDonationQueries();
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = await collectPaginatedExportRows<Donation>({
        maxRows: EXPORT_MAX_ROWS,
        chunkSize: 100,
        fetchPage: async (currentPage, limit) => {
          const response = await donationsService.getAll({
            page: currentPage,
            limit,
            donationStatus: donationStatusFilter !== 'all' ? donationStatusFilter : undefined,
            paymentType: paymentTypeFilter !== 'all' ? (paymentTypeFilter as any) : undefined,
            fundId: selectedFundId,
            search: debouncedSearch || undefined,
          });

          return {
            data: response.data,
            page: response.page,
            totalPages: response.totalPages,
          };
        },
      });

      await downloadPdfExport({
        filename: `donations-${Date.now()}.pdf`,
        title: 'Donations Export',
        rows,
        columns: [
          { header: 'Date', value: (row) => formatDate(row.createdAt) },
          { header: 'Donor', value: (row) => row.donorName?.trim() || 'Anonymous' },
          { header: 'Contact', value: (row) => row.donorPhone ?? row.donorEmail ?? '-' },
          { header: 'Amount', value: (row) => formatCurrency(row.amount, row.currency ?? '₹') },
          { header: 'Payment Type', value: (row) => formatPaymentType(row.paymentType) },
          { header: 'Status', value: (row) => row.donationStatus },
          { header: 'Recorded By', value: (row) => row.createdByName ?? '-' },
        ],
      });

      if (rows.length >= EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export donations'));
    } finally {
      setIsExporting(false);
    }
  };

  const donations = donationsQuery.data?.data ?? [];
  const currentPage = donationsQuery.data?.page ?? page;
  const currentLimit = donationsQuery.data?.pageSize ?? limit;
  const currentTotal = donationsQuery.data?.total ?? 0;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage * currentLimit < currentTotal;
  const isLoading = donationsQuery.isLoading;

  const pendingCount = pendingCountQuery.data?.count ?? 0;
  const selectedDonations = donations.filter((item) => selectedIds.includes(item.id));
  const hasSelectedItems = selectedDonations.length > 0;
  const allSelectedPending = hasSelectedItems && selectedDonations.every((item) => item.donationStatus === 'PENDING');
  const selectableDonationIds = donations
    .filter((item) => item.donationStatus === 'PENDING' || item.donationStatus === 'VERIFIED')
    .map((item) => item.id);

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds([]);
      }
      return next;
    });
  };

  const selectAllPending = () => {
    if (!isSelectionMode) return;
    setSelectedIds(selectableDonationIds);
  };

  const handleBulkDelete = async () => {
    if (!canDeleteAction || !canDelete) return;

    const targetIds = selectedDonations.map((item) => item.id);

    if (targetIds.length === 0) {
      toast.error('Select at least one donation');
      return;
    }

    setBulkActionLoading('delete');
    try {
      await Promise.allSettled(targetIds.map((id) => donationsService.delete(id)));
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      toast.success('Selected donations moved to trash');
      await invalidateDonationQueries();
      await invalidateMoneyQueries(queryClient);
    } finally {
      setBulkActionLoading(null);
    }
  };

  const tabs: Array<{ label: string; value: 'all' | 'PENDING' | 'VERIFIED' }> = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Verified', value: 'VERIFIED' },
  ];

  return (
    <div className="ds-section ds-stack">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
          <h1 className="text-xl font-semibold text-foreground">Donations</h1>
          <p className="text-sm text-muted-foreground">Manage and track all donations received</p>
        </div>
          {canViewPendingCount ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-md px-3" onClick={toggleSelectionMode}>
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {isSelectionMode ? 'Done' : 'Select'}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => (
            <div key={tab.value} className="relative">
              <Button
                type="button"
                variant={donationStatusFilter === tab.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDonationStatusFilter(tab.value);
                  setPage(1);
                }}
                className="h-8 w-full rounded-md px-2 text-[11px]"
              >
                <span className="truncate">{tab.label}</span>
              </Button>
              {tab.value === 'PENDING' && canViewPendingCount && pendingCount > 0 ? (
                <Badge variant="destructive" className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none">
                  {pendingCount}
                </Badge>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Search donor..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="h-9 flex-1 rounded-md"
          />
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setIsFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isSelectionMode ? (
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-foreground">Selected: {selectedIds.length}</p>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-md px-2 text-xs" onClick={selectAllPending}>
              Select All
            </Button>
            {allSelectedPending ? (
              <>
                <Button size="sm" variant="outline" className="h-8 rounded-md border border-green-200 bg-transparent px-2 text-xs text-green-600 hover:bg-green-50" disabled={bulkActionLoading !== null} onClick={() => handleBulkAction('approve')}>
                  {bulkActionLoading === 'approve' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 rounded-md border border-red-200 bg-transparent px-2 text-xs text-red-600 hover:bg-red-50" disabled={bulkActionLoading !== null} onClick={() => handleBulkAction('reject')}>
                  {bulkActionLoading === 'reject' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Reject
                </Button>
              </>
            ) : hasSelectedItems ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-md border border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100"
                disabled={bulkActionLoading !== null}
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                {bulkActionLoading === 'delete' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Delete
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md px-2 text-xs" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      <div className="ds-stack">
        {isLoading ? (
          <Card className="border">
            <CardContent className="py-6">
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            </CardContent>
          </Card>
        ) : donations.length === 0 ? (
          <Card className="border">
            <CardContent className="py-6">
              <ListEmptyState
                title="No donations yet"
                description="Start by recording your first donation."
                actionLabel={canManageDonations && canCreateAction ? 'Add Donation' : 'Clear Filters'}
                actionHref={canManageDonations && canCreateAction ? '/dashboard/donations/add' : undefined}
                onAction={
                  canManageDonations && canCreateAction
                    ? undefined
                    : () => {
                        setSearchQuery('');
                        setDonationStatusFilter('all');
                        setPendingStatusFilter('all');
                        setPaymentTypeFilter('all');
                        setPendingPaymentTypeFilter('all');
                        setFundTypeFilter('all');
                        setPage(1);
                      }
                }
              />
            </CardContent>
          </Card>
        ) : (
          donations.map((donation) => {
            const isDeleting = loadingId === donation.id;
            const canReview = canViewPendingCount && donation.donationStatus === 'PENDING';
            const canEditDonation = canManageDonations && canEditAction && (
              donation.donationStatus === 'PENDING' ||
              (!isTreasurer && donation.donationStatus === 'VERIFIED')
            );
            const statusClass = donation.donationStatus === 'PENDING'
              ? 'bg-amber-100 text-amber-900'
              : 'bg-emerald-100 text-emerald-900';
            const roleText = (donation.createdByRole ?? 'UNKNOWN').toUpperCase();
            const roleClass = roleText === 'SUPER_ADMIN'
              ? 'bg-emerald-100 text-emerald-800'
              : roleText === 'ADMIN'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700';
            const isSelectable = donation.donationStatus === 'PENDING' || donation.donationStatus === 'VERIFIED';
            const toggleSelection = () => {
              if (!isSelectable) return;
              setSelectedIds((prev) =>
                prev.includes(donation.id)
                  ? prev.filter((id) => id !== donation.id)
                  : [...new Set([...prev, donation.id])],
              );
            };
            return (
              <div
                key={donation.id}
                className={`space-y-2 rounded-lg border px-4 shadow-sm cursor-pointer ${
                  isSelectionMode && selectedIds.includes(donation.id)
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : ''
                } ${isSelectionMode ? 'py-2.5' : 'py-3'}`}
                onClick={(e) => {
                  if (isSelectionMode) {
                    e.preventDefault();
                    toggleSelection();
                    return;
                  }
                  router.push(`/dashboard/donations/${donation.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {isSelectionMode && canViewPendingCount ? (
                      <Checkbox
                        disabled={!isSelectable}
                        checked={selectedIds.includes(donation.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection();
                        }}
                        className="mt-0.5"
                      />
                    ) : null}
                    <p className="truncate text-base font-semibold text-foreground">{donation.donorName?.trim() || 'Anonymous'}</p>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(donation.amount, donation.currency ?? '₹')}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(donation.createdAt)} • {formatPaymentType(donation.paymentType)}
                  </p>
                  <Badge className={`text-xs ${statusClass}`}>{donation.donationStatus}</Badge>
                </div>
                {/* <p className="text-xs text-muted-foreground">
                  Contact: {donation.donorPhone || donation.donorEmail || '-'}
                </p> */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p>{donation.fund?.name ?? '-'}</p>
                  <Badge variant="secondary" className={`h-5 rounded-md px-2 text-[10px] ${roleClass}`}>{roleText}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p className="truncate">Added by: {donation.createdByName ?? 'Unknown'}</p>
                  <span />
                </div>
                {!isSelectionMode ? (
                  <div className="grid grid-cols-3 gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  {canReview ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-green-200 bg-transparent px-3 text-xs whitespace-nowrap text-green-600 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(donation.id);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-red-200 bg-transparent px-3 text-xs whitespace-nowrap text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(donation.id);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {!canReview ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md px-3 text-xs whitespace-nowrap"
                        disabled={!canEditDonation}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canEditDonation) return;
                          router.push(`/dashboard/donations/${donation.id}/edit`);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-red-200 bg-red-50 px-3 text-xs whitespace-nowrap text-red-700 hover:bg-red-100"
                        disabled={!(donation.donationStatus === 'VERIFIED' && canDelete && canDeleteAction) || isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canDeleteAction || !canDelete) return;
                          setConfirmDeleteId(donation.id);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptModalDonation(donation);
                          setReceiptContentLoaded(false);
                        }}
                      >
                        Receipt
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceiptModalDonation(donation);
                        setReceiptContentLoaded(false);
                      }}
                    >
                      Receipt
                    </Button>
                  )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {currentTotal > currentLimit ? (
        <div className="flex flex-row items-center justify-between gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="w-auto"
            disabled={!canGoPrevious}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Page {currentPage}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-auto"
            disabled={!canGoNext}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {canManageDonations && canCreateAction ? (
        <Button
          type="button"
          onClick={() => router.push('/dashboard/donations/add')}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full p-0 text-xl shadow-lg"
          aria-label="Add donation"
        >
          +
        </Button>
      ) : null}

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 ds-stack">
            <Select value={pendingStatusFilter} onValueChange={(v) => setPendingStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pendingPaymentTypeFilter} onValueChange={setPendingPaymentTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatPaymentType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => {
                setDonationStatusFilter(pendingStatusFilter);
                setPaymentTypeFilter(pendingPaymentTypeFilter);
                setPage(1);
                setIsFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open && !loadingId) {
            setConfirmDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this donation and move it to Trash. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(loadingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmDeleteId || Boolean(loadingId) || !canDeleteAction || !canDelete}
              onClick={(e) => {
                e.preventDefault();
                if (!confirmDeleteId) return;
                handleDelete(confirmDeleteId).finally(() => {
                  setConfirmDeleteId(null);
                });
              }}
            >
              {loadingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedIds.length} items. They will be moved to trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading === 'delete'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkActionLoading === 'delete' || !canDeleteAction || !canDelete}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              {bulkActionLoading === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(receiptModalDonation)}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptModalDonation(null);
            setReceiptContentLoaded(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Donation Receipt</DialogTitle>
            <DialogDescription>
              {receiptModalDonation
                ? `${receiptModalDonation.donorName?.trim() || 'Anonymous'} • ${formatCurrency(receiptModalDonation.amount, receiptModalDonation.currency ?? '₹')}`
                : 'Receipt preview'}
            </DialogDescription>
          </DialogHeader>

          {receiptModalDonation ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Donation ID</p>
                  <p className="font-medium">{receiptModalDonation.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(receiptModalDonation.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{receiptModalDonation.donationStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Type</p>
                  <p className="font-medium">{formatPaymentType(receiptModalDonation.paymentType)}</p>
                </div>
              </div>

              {!receiptContentLoaded ? (
                receiptModalDonation.receipt || receiptModalDonation.donationStatus === 'VERIFIED' ? (
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">Click to load receipt preview</p>
                    <Button type="button" onClick={() => setReceiptContentLoaded(true)}>
                      Load Receipt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">
                      Receipt will be available after admin verification.
                    </p>
                  </div>
                )
              ) : receiptModalDonation.receipt ? (
                (() => {
                  const url = resolveReceiptUrl(
                    receiptModalDonation.receipt,
                    apiOrigin,
                  );
                  if (!url) {
                    return <p className="text-sm text-muted-foreground">Receipt preview unavailable.</p>;
                  }

                  const isPdf = url.toLowerCase().includes('.pdf');
                  return (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Receipt Preview</p>
                      {isPdf ? (
                        <iframe
                          src={url}
                          title="Receipt Preview"
                          loading="lazy"
                          className="h-105 w-full rounded-md border"
                        />
                      ) : (
                         
                        <img
                          src={url}
                          alt="Receipt"
                          loading="lazy"
                          className="max-h-105 w-full rounded-md border object-contain"
                        />
                      )}
                    </div>
                  );
                })()
              ) : receiptModalDonation?.intentId && receiptModalDonation.donationStatus === 'VERIFIED' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Verified Receipt</p>
                  <iframe
                    src={`/donate/receipt/${receiptModalDonation.intentId}`}
                    title="Verified Donation Receipt"
                    loading="lazy"
                    className="h-105 w-full rounded-md border"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Receipt will be available after admin verification.
                </p>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {receiptModalDonation?.receipt ? (
              <Button
                onClick={() => {
                  if (!receiptModalDonation?.receipt) return;
                  const url = resolveReceiptUrl(
                    receiptModalDonation.receipt,
                    apiOrigin,
                  );
                  if (url) router.push(url);
                }}
              >
                Download
              </Button>
            ) : receiptModalDonation?.intentId ? (
              <Button
                onClick={() =>
                  router.push(`${apiBaseUrl}${donationsService.getPublicReceiptPdfUrl(receiptModalDonation.intentId)}`)
                }
              >
                Download
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

