import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Muqtadi } from '@/types';
import { muqtadisService } from '@/services/muqtadis.service';
import { getErrorMessage } from '@/src/utils/error';
import { useDebounce } from '@/hooks/useDebounce';

export type SortOrder = 'newest' | 'oldest';
export type AccountFilter = 'all' | 'account' | 'offline';
export type VerificationFilter = 'all' | 'verified' | 'pending';
export type StatusFilter = 'all' | 'active' | 'disabled';
export type CycleFilter = 'all' | 'included' | 'not_included';
export type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'proof_pending';

type UseMuqtadisOptions = {
  enabled: boolean;
  selectedDetailId?: string | null;
  refreshDetails?: (id: string) => Promise<void>;
};

export function useMuqtadis(options: UseMuqtadisOptions) {
  const { enabled, selectedDetailId, refreshDetails } = options;

  const [isLoading, setIsLoading] = useState(true);
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
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Muqtadi[]>([]);
  const [pendingItems, setPendingItems] = useState<Muqtadi[]>([]);
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

  const fetchLockRef = useRef(false);
  const fetchRequestSeqRef = useRef(0);
  const settingsLoadedRef = useRef(false);
  const listCacheRef = useRef<{
    key: string;
    at: number;
    data: Muqtadi[];
    pending: Muqtadi[];
    totalPages: number;
    backendStats: {
      verifiedHouseholds: number;
      verifiedMuqtadies: number;
      pendingHouseholds: number;
      pendingMuqtadies: number;
    };
    totalMuqtadies: number;
    registeredMuqtadies: number;
    totalSalary: number;
    perHead: number;
  } | null>(null);

  const parseBooleanValue = useCallback((value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
    }
    return false;
  }, []);

  const resolvePaymentStatus = useCallback((item: Muqtadi): 'PAID' | 'PARTIAL' | 'UNPAID' => {
    const rawStatus = String((item as Muqtadi & { currentCyclePaymentStatus?: string }).currentCyclePaymentStatus || item.paymentStatus || '').trim().toUpperCase();
    if (rawStatus === 'PAID') return 'PAID';
    if (rawStatus === 'PARTIAL') return 'PARTIAL';
    return 'UNPAID';
  }, []);

  const fetchItems = useCallback(async () => {
    if (!enabled) return;
    if (fetchLockRef.current) return;

    const cacheKey = `${page}:${debouncedSearch}`;
    const now = Date.now();
    const cache = listCacheRef.current;
    if (cache && cache.key === cacheKey && now - cache.at < 5000) {
      setItems(cache.data);
      setPendingItems(cache.pending);
      setTotalPages(cache.totalPages);
      setBackendStats(cache.backendStats);
      setSalarySummary({
        totalMuqtadies: cache.totalMuqtadies,
        registeredMuqtadies: cache.registeredMuqtadies,
        totalSalary: cache.totalSalary,
        perHead: cache.perHead,
      });
      return;
    }

    fetchLockRef.current = true;
    const requestSeq = ++fetchRequestSeqRef.current;
    setIsLoading(true);
    try {
      const [result, summary, statsResponse] = await Promise.all([
        muqtadisService.getAll({ page, limit: 20, search: debouncedSearch || undefined }),
        muqtadisService.getSalarySummary(),
        muqtadisService.getStats(),
      ]);

      if (requestSeq !== fetchRequestSeqRef.current) {
        return;
      }

      const boundedData = result.data.length > 50 ? result.data.slice(0, 50) : result.data;
      setItems(boundedData);
      setPendingItems(result.pending);
      setTotalPages(result.totalPages);
      const normalizedStats = {
        verifiedHouseholds: statsResponse.totalHouseholds,
        verifiedMuqtadies: statsResponse.totalMuqtadies,
        pendingHouseholds: statsResponse.pending,
        pendingMuqtadies: 0,
      };
      setBackendStats(normalizedStats);
      setSalarySummary({
        totalMuqtadies: summary.totalMuqtadies,
        registeredMuqtadies: summary.registeredMuqtadies,
        totalSalary: summary.totalSalary,
        perHead: summary.perHead,
      });

      listCacheRef.current = {
        key: cacheKey,
        at: now,
        data: boundedData,
        pending: result.pending,
        totalPages: result.totalPages,
        backendStats: normalizedStats,
        totalMuqtadies: summary.totalMuqtadies,
        registeredMuqtadies: summary.registeredMuqtadies,
        totalSalary: summary.totalSalary,
        perHead: summary.perHead,
      };
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load muqtadis'));
    } finally {
      setIsLoading(false);
      fetchLockRef.current = false;
    }
  }, [debouncedSearch, enabled, page]);

  const sortByCreatedAt = useCallback((list: Muqtadi[]) => {
    return [...list].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? right - left : left - right;
    });
  }, [sortOrder]);

  const filteredItems = useMemo(() => {
    const sourceItems = verificationFilter === 'pending' ? pendingItems : items;
    const sorted = sortByCreatedAt(sourceItems);

    return sorted.filter((item) => {
      const normalizedName = (item.name || '').toLowerCase();
      const normalizedPhone = (item.whatsappNumber || item.phone || '').toLowerCase();
      const normalizedSearch = debouncedSearch.trim().toLowerCase();

      if (normalizedSearch) {
        const matches = normalizedName.includes(normalizedSearch) || normalizedPhone.includes(normalizedSearch);
        if (!matches) return false;
      }

      const accountState = item.accountState || 'OFFLINE';
      if (accountFilter === 'account' && accountState === 'OFFLINE') return false;
      if (accountFilter === 'offline' && accountState !== 'OFFLINE') return false;

      const isDisabled = Boolean((item as Muqtadi & { isDeleted?: boolean }).isDeleted || item.isDisabled || item.status === 'DISABLED');
      if (statusFilter === 'active' && isDisabled) return false;
      if (statusFilter === 'disabled' && !isDisabled) return false;

      const cycleIncludedRaw = (item as Muqtadi & {
        isIncludedInCycle?: boolean;
        includedInCycle?: boolean;
        cycleIncluded?: boolean;
        inCurrentCycle?: boolean;
        currentlyIncludedInCycle?: boolean;
      }).isIncludedInCycle
        ?? (item as any).includedInCycle
        ?? (item as any).cycleIncluded
        ?? (item as any).inCurrentCycle
        ?? (item as any).currentlyIncludedInCycle;
      const cycleIncluded = parseBooleanValue(cycleIncludedRaw);
      if (cycleFilter === 'included' && !cycleIncluded) return false;
      if (cycleFilter === 'not_included' && cycleIncluded) return false;

      const paymentStatus = resolvePaymentStatus(item);
      const proofPendingRaw = (item as Muqtadi & {
        proofPending?: boolean | string | number;
        isProofPending?: boolean | string | number;
        paymentProofPending?: boolean | string | number;
        paymentVerificationStatus?: string;
      }).proofPending
        ?? (item as any).isProofPending
        ?? (item as any).paymentProofPending
        ?? (item as any).paymentVerificationStatus;
      const proofPending = parseBooleanValue(proofPendingRaw)
        || String((item as any).paymentVerificationStatus || '').trim().toUpperCase() === 'PENDING';

      if (paymentFilter !== 'all' && !cycleIncluded) return false;
      if (paymentFilter === 'proof_pending' && !proofPending) return false;
      if (paymentFilter === 'paid' && paymentStatus !== 'PAID') return false;
      if (paymentFilter === 'partial' && paymentStatus !== 'PARTIAL') return false;
      if (paymentFilter === 'unpaid' && paymentStatus !== 'UNPAID') return false;

      if (verificationFilter === 'verified' && !item.isVerified) return false;
      if (verificationFilter === 'pending' && item.isVerified) return false;

      return true;
    });
  }, [accountFilter, cycleFilter, debouncedSearch, items, parseBooleanValue, paymentFilter, pendingItems, resolvePaymentStatus, sortByCreatedAt, statusFilter, verificationFilter]);

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
    if (!enabled) return;
    void fetchItems();
  }, [enabled, fetchItems]);

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
      isLoading,
      pendingVerificationId,
    },
  };
}
