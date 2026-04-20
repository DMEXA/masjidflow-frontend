import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Muqtadi } from '@/types';
import { muqtadisService } from '@/services/muqtadis.service';
import { getErrorMessage } from '@/src/utils/error';
import { useDebounce } from '@/hooks/useDebounce';
import { queryKeys } from '@/lib/query-keys';

export type SortOrder = 'newest' | 'oldest';
export type AccountFilter = 'all' | 'account' | 'offline';
export type VerificationFilter = 'all' | 'verified' | 'pending';
export type StatusFilter = 'all' | 'active' | 'disabled';
export type CycleFilter = 'all' | 'included' | 'not_included';
export type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'proof_pending';
const MUQTADI_PAGE_LIMIT = 20;

type UseMuqtadisOptions = {
  enabled: boolean;
  selectedDetailId?: string | null;
  refreshDetails?: (id: string) => Promise<void>;
};

export function useMuqtadis(options: UseMuqtadisOptions) {
  const { enabled, selectedDetailId, refreshDetails } = options;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [pendingSortOrder, setPendingSortOrder] = useState<SortOrder>('newest');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [targetMuqtadies, setTargetMuqtadies] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(MUQTADI_PAGE_LIMIT);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Muqtadi[]>([]);
  const [backendStats, setBackendStats] = useState({
    verifiedHouseholds: 0,
    verifiedMuqtadies: 0,
    pendingHouseholds: 0,
    pendingMuqtadies: 0,
  });
  const [salarySummary, setSalarySummary] = useState({
    totalMuqtadies: 0,
    registeredMuqtadies: 0,
    totalSalary: 0,
    perHead: 0,
  });
  const [pendingVerificationId, setPendingVerificationId] = useState<string | null>(null);

  const settingsLoadedRef = useRef(false);

  const {
    data: listResult,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useQuery({
    queryKey: queryKeys.muqtadis({
      page,
      limit,
      search: debouncedSearch,
      accountStatus: accountFilter,
      paymentStatus: paymentFilter,
      verificationStatus: verificationFilter,
      cycleStatus: cycleFilter,
    }),
    queryFn: () => muqtadisService.getAll({
      page,
      limit,
      search: debouncedSearch || undefined,
      accountStatus: accountFilter,
      paymentStatus: paymentFilter,
      verificationStatus: verificationFilter,
      cycleStatus: cycleFilter,
    }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: queryKeys.muqtadiSalarySummary,
    queryFn: () => muqtadisService.getSalarySummary(),
    enabled,
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const {
    data: statsResponse,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.muqtadiStats,
    queryFn: () => muqtadisService.getStats(),
    enabled,
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const resolvePaymentStatus = useCallback((item: Muqtadi): 'PAID' | 'PARTIAL' | 'UNPAID' => {
    const rawStatus = String((item as Muqtadi & { currentCyclePaymentStatus?: string }).currentCyclePaymentStatus || item.paymentStatus || '').trim().toUpperCase();
    if (rawStatus === 'PAID') return 'PAID';
    if (rawStatus === 'PARTIAL') return 'PARTIAL';
    return 'UNPAID';
  }, []);

  const fetchItems = useCallback(async () => {
    if (!enabled) return;
    try {
      await Promise.all([refetchList(), refetchSummary(), refetchStats()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load muqtadis'));
    }
  }, [enabled, refetchList, refetchStats, refetchSummary]);

  useEffect(() => {
    if (!listResult) return;
    const boundedData = listResult.data.length > 50 ? listResult.data.slice(0, 50) : listResult.data;
    setItems(boundedData);
    setTotalPages(listResult.totalPages);
  }, [listResult]);

  useEffect(() => {
    if (!enabled || !listResult) return;

    const total = listResult.totalPages ?? 1;
    if (page >= total) return;

    const nextPage = page + 1;
    const nextQueryKey = queryKeys.muqtadis({
      page: nextPage,
      limit,
      search: debouncedSearch,
      accountStatus: accountFilter,
      paymentStatus: paymentFilter,
      verificationStatus: verificationFilter,
      cycleStatus: cycleFilter,
    });

    if (queryClient.getQueryData(nextQueryKey)) return;

    void queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => muqtadisService.getAll({
        page: nextPage,
        limit,
        search: debouncedSearch || undefined,
        accountStatus: accountFilter,
        paymentStatus: paymentFilter,
        verificationStatus: verificationFilter,
        cycleStatus: cycleFilter,
      }),
      staleTime: 8000,
    });
  }, [
    enabled,
    listResult,
    page,
    limit,
    debouncedSearch,
    accountFilter,
    paymentFilter,
    verificationFilter,
    cycleFilter,
    queryClient,
  ]);

  useEffect(() => {
    if (!summary) return;
    setSalarySummary({
      totalMuqtadies: summary.totalMuqtadies,
      registeredMuqtadies: summary.registeredMuqtadies,
      totalSalary: summary.totalSalary,
      perHead: summary.perHead,
    });
  }, [summary]);

  useEffect(() => {
    if (!statsResponse) return;
    setBackendStats({
      verifiedHouseholds: statsResponse.totalHouseholds,
      verifiedMuqtadies: statsResponse.totalMuqtadies,
      pendingHouseholds: statsResponse.pending,
      pendingMuqtadies: 0,
    });
  }, [statsResponse]);

  const sortByCreatedAt = useCallback((list: Muqtadi[]) => {
    return [...list].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [sortOrder]);

  const filteredItems = useMemo(() => sortByCreatedAt(items), [items, sortByCreatedAt]);

  const stats = useMemo(() => {
    const totalHouseholds = backendStats.verifiedHouseholds;
    const totalMuqtadies = backendStats.verifiedMuqtadies;
    const verified = backendStats.verifiedHouseholds;
    const pending = backendStats.pendingHouseholds;
    const target = Math.max(0, targetMuqtadies);
    const remaining = Math.max(target - totalMuqtadies, 0);

    return {
      totalHouseholds,
      totalMuqtadies,
      target,
      remaining,
      verified,
      pending,
    };
  }, [backendStats, targetMuqtadies]);

  const verifyMuqtadi = useCallback(async (item: Muqtadi) => {
    if (pendingVerificationId) return;
    setPendingVerificationId(item.id);
    try {
      await muqtadisService.verify(item.id);
      toast.success('Household verified');
      await fetchItems();
      if (selectedDetailId === item.id && refreshDetails) {
        await refreshDetails(item.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify household'));
    } finally {
      setPendingVerificationId(null);
    }
  }, [fetchItems, pendingVerificationId, refreshDetails, selectedDetailId]);

  const rejectMuqtadi = useCallback(async (item: Muqtadi) => {
    if (pendingVerificationId) return;
    setPendingVerificationId(item.id);
    try {
      await muqtadisService.reject(item.id);
      toast.success('Household marked as pending');
      await fetchItems();
      if (selectedDetailId === item.id && refreshDetails) {
        await refreshDetails(item.id);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update household verification'));
    } finally {
      setPendingVerificationId(null);
    }
  }, [fetchItems, pendingVerificationId, refreshDetails, selectedDetailId]);

  useEffect(() => {
    setPage(1);
  }, [accountFilter, cycleFilter, paymentFilter, statusFilter, verificationFilter]);

  useEffect(() => {
    if (!enabled) return;
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;
    const loadTargetMuqtadies = async () => {
      try {
        const settings = await muqtadisService.getSettings();
        setTargetMuqtadies(Number(settings.totalMuqtadies) || 0);
      } catch {
        setTargetMuqtadies(0);
      }
    };

    void loadTargetMuqtadies();
  }, [enabled]);

  return {
    items,
    setItems,
    filteredItems,
    stats,
    filters: {
      search,
      sortOrder,
      pendingSortOrder,
      accountFilter,
      verificationFilter,
      statusFilter,
      cycleFilter,
      paymentFilter,
      page,
      limit,
      totalPages,
      salarySummary,
    },
    setFilters: {
      setSearch,
      setSortOrder,
      setPendingSortOrder,
      setAccountFilter,
      setVerificationFilter,
      setStatusFilter,
      setCycleFilter,
      setPaymentFilter,
      setPage,
    },
    actions: {
      fetchItems,
      resolvePaymentStatus,
      verifyMuqtadi,
      rejectMuqtadi,
    },
    loading: {
      isLoading: isListLoading || isSummaryLoading || isStatsLoading,
      pendingVerificationId,
    },
  };
}
