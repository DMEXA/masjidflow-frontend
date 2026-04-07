import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Muqtadi } from '@/types';
import { muqtadisService } from '@/services/muqtadis.service';
import { getErrorMessage } from '@/src/utils/error';
import { useDebounce } from '@/hooks/useDebounce';

export type SortOrder = 'newest' | 'oldest';
export type AccountFilter = 'all' | 'account' | 'offline';
export type VerificationFilter = 'ALL' | 'VERIFIED' | 'PENDING';
export type PaymentFilter = 'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID';

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
  const [statusFilter, setStatusFilter] = useState<VerificationFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
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
  const [salarySummary, setSalarySummary] = useState({ totalMuqtadies: 0, registeredMuqtadies: 0 });
  const [pendingVerificationId, setPendingVerificationId] = useState<string | null>(null);

  const fetchLockRef = useRef(false);
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
  } | null>(null);

  const resolvePaymentStatus = useCallback((item: Muqtadi): 'PAID' | 'PARTIAL' | 'UNPAID' => {
    if (item.paymentStatus === 'PAID') return 'PAID';
    if (item.paymentStatus === 'PARTIAL') return 'PARTIAL';
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
      });
      return;
    }

    fetchLockRef.current = true;
    setIsLoading(true);
    try {
      const [result, summary] = await Promise.all([
        muqtadisService.getAll({ page, limit: 20, search: debouncedSearch || undefined }),
        muqtadisService.getSalarySummary(),
      ]);

      const boundedData = result.data.length > 50 ? result.data.slice(0, 50) : result.data;
      setItems(boundedData);
      setPendingItems(result.pending);
      setTotalPages(result.totalPages);
      setBackendStats(result.stats);
      setSalarySummary({
        totalMuqtadies: summary.totalMuqtadies,
        registeredMuqtadies: summary.registeredMuqtadies,
      });

      listCacheRef.current = {
        key: cacheKey,
        at: now,
        data: boundedData,
        pending: result.pending,
        totalPages: result.totalPages,
        backendStats: result.stats,
        totalMuqtadies: summary.totalMuqtadies,
        registeredMuqtadies: summary.registeredMuqtadies,
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
    const sourceItems = statusFilter === 'PENDING' ? pendingItems : items;
    const sorted = sortByCreatedAt(sourceItems);

    return sorted.filter((item) => {
      if (accountFilter === 'account' && !item.userId) return false;
      if (accountFilter === 'offline' && item.userId) return false;

      const paymentStatus = resolvePaymentStatus(item);
      if (paymentFilter !== 'ALL' && paymentStatus !== paymentFilter) return false;
      return true;
    });
  }, [accountFilter, items, paymentFilter, pendingItems, resolvePaymentStatus, sortByCreatedAt, statusFilter]);

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
  }, [accountFilter, paymentFilter, statusFilter]);

  useEffect(() => {
    if (!enabled) return;
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
      statusFilter,
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
      setStatusFilter,
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
