"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermission } from "@/hooks/usePermission";
import {
  formatCurrency,
  formatDate,
  formatExpenseCategory,
} from "@/src/utils/format";
import { getErrorMessage } from "@/src/utils/error";
import { Download, Loader2, SlidersHorizontal, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { expensesService } from "@/services/expenses.service";
import { useAuthStore } from "@/src/store/auth.store";
import type { Expense } from "@/types";
import { EXPENSE_CATEGORIES } from "@/src/constants";
import {
  collectPaginatedExportRows,
  downloadPdfExport,
  EXPORT_MAX_ROWS,
} from "@/src/utils/export";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useFundsListQuery } from "@/hooks/useFundsListQuery";
import { useDebounce } from "@/hooks/useDebounce";
import {
  invalidateExpenseMutationQueries,
  invalidateMoneyQueries,
} from "@/lib/money-cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ListEmptyState } from "@/components/common/list-empty-state";
import { queryKeys } from "@/lib/query-keys";
import { getSafeLimit } from "@/src/utils/pagination";

export default function ExpensesPage() {
  const router = useRouter();
  const { canManageExpenses, canDelete, isAdmin, isSuperAdmin, isTreasurer } =
    usePermission();
  const canViewPendingCount = isAdmin || isSuperAdmin;
  const queryClient = useQueryClient();
  const { mosque, token, user } = useAuthStore();
  const {
    canCreate: canCreateAction,
    canEdit: canEditAction,
    canDelete: canDeleteAction,
  } = usePermission(user?.role);
  const mosqueId = mosque?.id ?? "none";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "PENDING" | "VERIFIED" | "INITIATED"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fundTypeFilter, setFundTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<
    "all" | "PENDING" | "VERIFIED" | "INITIATED"
  >("all");
  const [pendingCategoryFilter, setPendingCategoryFilter] =
    useState<string>("all");
  const [pendingFundTypeFilter, setPendingFundTypeFilter] =
    useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<
    "approve" | "reject" | "delete" | null
  >(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [limit] = useState(() => getSafeLimit(20));
  const debouncedSearch = useDebounce(searchQuery);

  const fundsQuery = useFundsListQuery(mosque?.id);
  const funds = useMemo(() => fundsQuery.data ?? [], [fundsQuery.data]);

  const selectedFundId = useMemo(() => {
    if (fundTypeFilter === "all") return undefined;
    const matched = funds.find((fund) => fund.type === fundTypeFilter);
    return matched?.id ?? "__missing_fund__";
  }, [fundTypeFilter, funds]);

  useEffect(() => {
    setPendingStatusFilter(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setPendingCategoryFilter(categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    setPendingFundTypeFilter(fundTypeFilter);
  }, [fundTypeFilter]);

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(mosqueId, {
      page,
      pageSize: limit,
      status: statusFilter,
      category: categoryFilter,
      fundType: fundTypeFilter,
      search: debouncedSearch,
    }),
    queryFn: () =>
      expensesService.getAll({
        page,
        pageSize: limit,
        status:
          statusFilter === "all"
            ? undefined
            : statusFilter === "VERIFIED"
              ? "APPROVED"
              : statusFilter === "INITIATED"
                ? "REJECTED"
                : "PENDING",
        category:
          categoryFilter !== "all" ? (categoryFilter as any) : undefined,
        fundId: selectedFundId,
        // search: debouncedSearch || undefined,
        search:
          debouncedSearch.trim() && isNaN(Number(debouncedSearch.trim()))
            ? debouncedSearch
            : undefined,
      }),
    enabled: Boolean(mosque?.id) && Boolean(token),
    placeholderData: keepPreviousData,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!mosque?.id || !token) return;
    if (!expensesQuery.data) return;

    const totalPages = expensesQuery.data.totalPages ?? 1;
    if (page >= totalPages) return;

    const nextPage = page + 1;
    const nextQueryKey = queryKeys.expenses(mosqueId, {
      page: nextPage,
      pageSize: limit,
      status: statusFilter,
      category: categoryFilter,
      fundType: fundTypeFilter,
      search: debouncedSearch,
    });

    if (queryClient.getQueryData(nextQueryKey)) return;

    void queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () =>
        expensesService.getAll({
          page: nextPage,
          pageSize: limit,
          status:
            statusFilter === "all"
              ? undefined
              : statusFilter === "VERIFIED"
                ? "APPROVED"
                : statusFilter === "INITIATED"
                  ? "REJECTED"
                  : "PENDING",
          category:
            categoryFilter !== "all" ? (categoryFilter as any) : undefined,
          fundId: selectedFundId,
          // search: debouncedSearch || undefined,
          search:
            debouncedSearch.trim() && isNaN(Number(debouncedSearch.trim()))
              ? debouncedSearch
              : undefined,
        }),
      staleTime: 5000,
    });
  }, [
    mosque?.id,
    token,
    expensesQuery.data,
    page,
    mosqueId,
    limit,
    statusFilter,
    categoryFilter,
    fundTypeFilter,
    debouncedSearch,
    selectedFundId,
    queryClient,
  ]);

  useEffect(() => {
    if (expensesQuery.error) {
      toast.error(
        getErrorMessage(expensesQuery.error, "Failed to load expenses"),
      );
    }
  }, [expensesQuery.error]);

  const pendingCountQuery = useQuery({
    queryKey: queryKeys.expensesPendingCount(mosque?.id),
    queryFn: () => expensesService.getPendingCount(),
    enabled: Boolean(mosque?.id) && Boolean(token) && canViewPendingCount,
    staleTime: 5000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesService.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.expensesRoot(mosqueId),
        exact: false,
      });
      const listQueryKey = queryKeys.expenses(mosqueId, {
        page,
        pageSize: limit,
        status: statusFilter,
        category: categoryFilter,
        fundType: fundTypeFilter,
        search: debouncedSearch,
      });
      const snapshot = queryClient.getQueryData(listQueryKey);

      queryClient.setQueryData(listQueryKey, (prev: any) => {
        if (!prev || !Array.isArray(prev.data)) return prev;
        return {
          ...prev,
          data: prev.data.filter((item: Expense) => item.id !== id),
        };
      });

      return { snapshot, listQueryKey };
    },
    onError: (_error, _id, context) => {
      if (context?.snapshot && context.listQueryKey) {
        queryClient.setQueryData(context.listQueryKey, context.snapshot);
      }
    },
    onSuccess: async () => {
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.funds(mosque?.id),
        exact: false,
      });
      await invalidateMoneyQueries(queryClient, mosque?.id);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => expensesService.approve(id),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => expensesService.reject(id),
  });

  const handleDelete = async (id: string) => {
    if (!canDeleteAction || !canDelete) return;
    if (loadingId) return;
    setLoadingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete expense"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    if (!canEditAction) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Expense approved");
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to approve expense"));
    }
  };

  const handleReject = async (id: string) => {
    if (!canEditAction) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success("Expense rejected");
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reject expense"));
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (!canEditAction) return;

    const targetIds = expenses
      .filter(
        (item) => selectedIds.includes(item.id) && item.status === "PENDING",
      )
      .map((item) => item.id);

    if (targetIds.length === 0) {
      toast.error("Select at least one pending expense");
      return;
    }

    setBulkActionLoading(action);
    try {
      if (action === "approve") {
        await Promise.allSettled(
          targetIds.map((id) => expensesService.approve(id)),
        );
      } else {
        await Promise.allSettled(
          targetIds.map((id) => expensesService.reject(id)),
        );
      }
      setSelectedIds([]);
      toast.success(`Bulk ${action} completed`);
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
    } finally {
      setBulkActionLoading(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = await collectPaginatedExportRows<Expense>({
        maxRows: EXPORT_MAX_ROWS,
        chunkSize: 100,
        fetchPage: async (currentPage, limit) => {
          const response = await expensesService.getAll({
            page: currentPage,
            pageSize: limit,
            status:
              statusFilter === "all"
                ? undefined
                : statusFilter === "VERIFIED"
                  ? "APPROVED"
                  : statusFilter === "INITIATED"
                    ? "REJECTED"
                    : "PENDING",
            category:
              categoryFilter !== "all" ? (categoryFilter as any) : undefined,
            fundId: selectedFundId,
            // search: debouncedSearch || undefined,
            search:
              debouncedSearch.trim() && isNaN(Number(debouncedSearch.trim()))
                ? debouncedSearch
                : undefined,
          });

          return {
            data: response.data,
            page: response.page,
            totalPages: response.totalPages,
          };
        },
      });

      await downloadPdfExport({
        filename: `expenses-${Date.now()}.pdf`,
        title: "Expenses Export",
        rows,
        columns: [
          { header: "Date", value: (row) => formatDate(row.createdAt) },
          {
            header: "Category",
            value: (row) => formatExpenseCategory(row.category),
          },
          { header: "Description", value: (row) => row.description },
          { header: "Vendor", value: (row) => row.vendor ?? "-" },
          {
            header: "Amount",
            value: (row) => formatCurrency(row.amount, row.currency),
          },
          { header: "Created By", value: (row) => row.createdByName ?? "-" },
        ],
      });

      if (rows.length >= EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to export expenses"));
    } finally {
      setIsExporting(false);
    }
  };

  // const expenses = expensesQuery.data?.data ?? [];
  const rawExpenses = expensesQuery.data?.data ?? [];

  const expenses = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return rawExpenses;
    }

    return rawExpenses.filter((expense) => {
      const searchableValues = [
        expense.description,
        expense.vendor,
        expense.category,
        expense.status,
        expense.createdByName,
        expense.createdByRole,
        expense.fund?.name,
        expense.id,

        Number(expense.amount ?? 0).toFixed(2),
        Number(expense.amount ?? 0).toString(),
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .trim()
          .toLowerCase()
          .includes(normalizedSearch),
      );
    });
  }, [rawExpenses, debouncedSearch]);
  const currentPage = expensesQuery.data?.page ?? page;
  const currentLimit = expensesQuery.data?.pageSize ?? limit;
  const currentTotal = expensesQuery.data?.total ?? 0;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage * currentLimit < currentTotal;
  const isLoading = expensesQuery.isLoading;
  const pendingCount = pendingCountQuery.data?.count ?? 0;
  const selectedExpenses = expenses.filter((item) =>
    selectedIds.includes(item.id),
  );
  const hasSelectedItems = selectedExpenses.length > 0;
  const allSelectedPending =
    hasSelectedItems &&
    selectedExpenses.every((item) => item.status === "PENDING");
  const selectableExpenseIds = expenses
    .filter((item) => item.status === "PENDING" || item.status === "APPROVED")
    .map((item) => item.id);

  const tabs: Array<{
    label: string;
    value: "all" | "PENDING" | "VERIFIED" | "INITIATED";
  }> = [
    { label: "All", value: "all" },
    { label: "Pending", value: "PENDING" },
    { label: "Verified", value: "VERIFIED" },
    { label: "Initiated", value: "INITIATED" },
  ];

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
    setSelectedIds(selectableExpenseIds);
  };

  const handleBulkDelete = async () => {
    if (!canDeleteAction || !canDelete) return;

    const targetIds = selectedExpenses.map((item) => item.id);

    if (targetIds.length === 0) {
      toast.error("Select at least one expense");
      return;
    }

    setBulkActionLoading("delete");
    try {
      await Promise.allSettled(
        targetIds.map((id) => expensesService.delete(id)),
      );
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      toast.success("Selected expenses moved to trash");
      await invalidateExpenseMutationQueries(queryClient, mosque?.id);
      await invalidateMoneyQueries(queryClient, mosque?.id);
    } finally {
      setBulkActionLoading(null);
    }
  };

  return (
    <div className="ds-section ds-stack">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage all mosque expenses
            </p>
          </div>
          {isAdmin || isSuperAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-3"
              onClick={toggleSelectionMode}
            >
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {isSelectionMode ? "Done" : "Select"}
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => (
            <div key={tab.value} className="relative">
              <Button
                type="button"
                variant={statusFilter === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className="h-8 w-full rounded-md px-2 text-[11px]"
              >
                <span className="truncate">{tab.label}</span>
              </Button>
              {tab.value === "PENDING" &&
              canViewPendingCount &&
              pendingCount > 0 ? (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
                >
                  {pendingCount}
                </Badge>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="h-9 flex-1 rounded-md"
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-md"
              onClick={() => setIsFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-md"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isSelectionMode ? (
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-foreground">
              Selected: {selectedIds.length}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-2 text-xs"
              onClick={selectAllPending}
            >
              Select All
            </Button>
            {allSelectedPending ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-md border border-green-200 bg-transparent px-2 text-xs text-green-600 hover:bg-green-50"
                  disabled={bulkActionLoading !== null}
                  onClick={() => handleBulkAction("approve")}
                >
                  {bulkActionLoading === "approve" ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-md border border-red-200 bg-transparent px-2 text-xs text-red-600 hover:bg-red-50"
                  disabled={bulkActionLoading !== null}
                  onClick={() => handleBulkAction("reject")}
                >
                  {bulkActionLoading === "reject" ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
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
                {bulkActionLoading === "delete" ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2 text-xs"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      <div className="ds-stack py-3">
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
        ) : expenses.length === 0 ? (
          <Card className="border">
            <CardContent className="py-6">
              <ListEmptyState
                title="No expenses yet"
                description="Record your first expense to start tracking outflow."
                actionLabel={
                  canManageExpenses && canCreateAction
                    ? "Add Expense"
                    : "Clear Filters"
                }
                actionHref={
                  canManageExpenses && canCreateAction
                    ? "/dashboard/expenses/add"
                    : undefined
                }
                onAction={
                  canManageExpenses && canCreateAction
                    ? undefined
                    : () => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setPendingStatusFilter("all");
                        setCategoryFilter("all");
                        setPendingCategoryFilter("all");
                        setFundTypeFilter("all");
                        setPendingFundTypeFilter("all");
                        setPage(1);
                      }
                }
              />
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => {
            const isDeleting = loadingId === expense.id;
            const canReview =
              (isAdmin || isSuperAdmin) && expense.status === "PENDING";
            const canEditExpense =
              canManageExpenses &&
              canEditAction &&
              (expense.status === "PENDING" || !isTreasurer);
            const statusClass =
              expense.status === "PENDING"
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-100 text-emerald-900";
            const roleText = (expense.createdByRole ?? "UNKNOWN").toUpperCase();
            const roleClass =
              roleText === "SUPER_ADMIN"
                ? "bg-emerald-100 text-emerald-800"
                : roleText === "ADMIN"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700";
            const isSelectable =
              expense.status === "PENDING" || expense.status === "APPROVED";
            const toggleSelection = () => {
              if (!isSelectable) return;
              setSelectedIds((prev) =>
                prev.includes(expense.id)
                  ? prev.filter((id) => id !== expense.id)
                  : [...new Set([...prev, expense.id])],
              );
            };
            return (
              <div
                key={expense.id}
                className={`rounded-lg border px-4 shadow-sm cursor-pointer overflow-hidden ${
                  isSelectionMode && selectedIds.includes(expense.id)
                    ? "border-red-400 bg-red-50/40"
                    : ""
                } ${isSelectionMode ? "py-2.5" : "py-3"}`}
                onClick={(e) => {
                  if (isSelectionMode) {
                    e.preventDefault();
                    toggleSelection();
                    return;
                  }
                  router.push(`/dashboard/expenses/${expense.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {isSelectionMode && (isAdmin || isSuperAdmin) ? (
                      <Checkbox
                        disabled={!isSelectable}
                        checked={selectedIds.includes(expense.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection();
                        }}
                        className="mt-0.5"
                      />
                    ) : null}
                    <p
                      className="truncate text-base font-semibold text-foreground"
                      title={expense.description || "Expense"}
                    >
                      {expense.description || "Expense"}
                    </p>
                  </div>
                  <p className="font-semibold text-red-600">
                    -{formatCurrency(expense.amount, expense.currency)}
                  </p>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.createdAt)} • Expense
                  </p>
                  <Badge className={`text-xs ${statusClass}`}>
                    {expense.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <p className="truncate whitespace-nowrap">
                    {expense.fund?.name ?? "-"} •{" "}
                    {formatExpenseCategory(expense.category)}
                  </p>
                  <span />
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p className="truncate">
                    Added by: {expense.createdByName ?? "Unknown"}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`h-5 rounded-md px-2 text-[10px] ${roleClass}`}
                  >
                    {roleText}
                  </Badge>
                </div>

                {!isSelectionMode ? (
                  <div
                    className="mt-2 grid grid-cols-3 gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canReview ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border border-green-200 bg-transparent px-3 text-xs whitespace-nowrap text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(expense.id);
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md border border-red-200 bg-transparent px-3 text-xs whitespace-nowrap text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(expense.id);
                          }}
                        >
                          Reject
                        </Button>
                        {expense.receipt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                            asChild
                          >
                            <Link
                              href={expense.receipt}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Receipt
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                            disabled
                          >
                            Receipt
                          </Button>
                        )}
                      </>
                    ) : null}

                    {!canReview ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md px-3 text-xs whitespace-nowrap"
                          disabled={!canEditExpense}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canEditExpense) return;
                            router.push(
                              `/dashboard/expenses/${expense.id}/edit`,
                            );
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md border border-red-200 bg-red-50 px-3 text-xs whitespace-nowrap text-red-700 hover:bg-red-100"
                          disabled={
                            !(
                              expense.status !== "PENDING" &&
                              canDelete &&
                              canDeleteAction
                            ) || isDeleting
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canDeleteAction || !canDelete) return;
                            setConfirmDeleteId(expense.id);
                          }}
                        >
                          Delete
                        </Button>
                        {expense.receipt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                            asChild
                          >
                            <Link
                              href={expense.receipt}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Receipt
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md border border-gray-200 bg-transparent px-3 text-xs whitespace-nowrap text-muted-foreground hover:bg-gray-50"
                            disabled
                          >
                            Receipt
                          </Button>
                        )}
                      </>
                    ) : null}
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

      {canManageExpenses && canCreateAction ? (
        <Button
          type="button"
          onClick={() => router.push("/dashboard/expenses/add")}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full p-0 text-white shadow-lg"
          aria-label="Add expense"
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
            <Select
              value={pendingCategoryFilter}
              onValueChange={setPendingCategoryFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {formatExpenseCategory(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={pendingFundTypeFilter}
              onValueChange={setPendingFundTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="MASJID">Masjid</SelectItem>
                <SelectItem value="BAITUL_MAAL">Baitul Maal</SelectItem>
                <SelectItem value="ZAKAT">Zakat</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pendingStatusFilter}
              onValueChange={(v) => setPendingStatusFilter(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="INITIATED">Initiated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => {
                setCategoryFilter(pendingCategoryFilter);
                setFundTypeFilter(pendingFundTypeFilter);
                setStatusFilter(pendingStatusFilter);
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
              This will delete this expense and move it to Trash. You can
              restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(loadingId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !confirmDeleteId ||
                Boolean(loadingId) ||
                !canDeleteAction ||
                !canDelete
              }
              onClick={(e) => {
                e.preventDefault();
                if (!confirmDeleteId) return;
                handleDelete(confirmDeleteId).finally(() => {
                  setConfirmDeleteId(null);
                });
              }}
            >
              {loadingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
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
              You are about to delete {selectedIds.length} items. They will be
              moved to trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading === "delete"}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                bulkActionLoading === "delete" || !canDeleteAction || !canDelete
              }
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              {bulkActionLoading === "delete" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
