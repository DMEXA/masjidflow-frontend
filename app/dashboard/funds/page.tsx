"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Pencil,
  Loader2,
  Wallet,
  Layers3,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fundsService } from "@/services/funds.service";
import { useAuthStore } from "@/src/store/auth.store";
import type { FundSummary } from "@/types";
import { getErrorMessage } from "@/src/utils/error";
import { ListEmptyState } from "@/components/common/list-empty-state";
import { formatCurrency } from "@/src/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { downloadPdfExport, EXPORT_MAX_ROWS } from "@/src/utils/export";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { invalidateMosqueLiveQueries } from "@/lib/realtime-invalidation";
import { queryKeys } from "@/lib/query-keys";
import { invalidateFundsQueries } from "@/lib/money-cache";

export default function FundsPage() {
  const router = useRouter();
  const { mosque, token, user } = useAuthStore();
  const { canCreate, canEdit, canDelete } = usePermission(user?.role);
  const queryClient = useQueryClient();
  const mosqueId = mosque?.id;

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringFundId, setRestoringFundId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fundType, setFundType] = useState<
    "MASJID" | "BAITUL_MAAL" | "ZAKAT" | "SADAQAH"
  >("MASJID");
  const [categories, setCategories] = useState<string[]>(["other"]);
  const [categoryInput, setCategoryInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minBalance] = useState("");
  const [showInactiveFunds, setShowInactiveFunds] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm);

  const fetchInactiveFunds = () => fundsService.getInactive();
  const fundsKey = queryKeys.funds(mosqueId);
  const inactiveFundsKey = queryKeys.inactiveFunds(mosqueId);

  const fundsQuery = useQuery<FundSummary[]>({
    queryKey: fundsKey,
    queryFn: () => fundsService.getSummary(),
    enabled: Boolean(mosqueId) && Boolean(token),
    staleTime: 45_000,
  });

  const inactiveFundsQuery = useQuery({
    queryKey: inactiveFundsKey,
    queryFn: fetchInactiveFunds,
    enabled: Boolean(mosqueId) && Boolean(token),
    staleTime: 45_000,
  });

  const funds = useMemo(() => fundsQuery.data ?? [], [fundsQuery.data]);
  const inactiveFunds = inactiveFundsQuery.data ?? [];

  useEffect(() => {
    if (fundsQuery.error) {
      toast.error(getErrorMessage(fundsQuery.error, "Failed to load funds"));
    }
  }, [fundsQuery.error]);

  useEffect(() => {
    if (inactiveFundsQuery.error) {
      toast.error(
        getErrorMessage(
          inactiveFundsQuery.error,
          "Failed to load inactive funds",
        ),
      );
    }
  }, [inactiveFundsQuery.error]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setFundType("MASJID");
    setCategories(["other"]);
    setCategoryInput("");
  };

  const normalizeCategory = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  const handleAddCategory = () => {
    const normalized = normalizeCategory(categoryInput);
    if (!normalized) {
      toast.error("Please enter a valid category");
      return;
    }

    if (categories.includes(normalized)) {
      toast.error("Category already added");
      return;
    }

    const extraCount = categories.filter((item) => item !== "other").length;
    if (extraCount >= 5) {
      toast.error("Maximum 5 additional categories are allowed");
      return;
    }

    setCategories((prev) => [...prev, normalized]);
    setCategoryInput("");
  };

  const validateForm = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error("Fund name must be between 2 and 100 characters");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    if (!validateForm()) return;

    if (!fundType) {
      toast.error("Please select a fund type");
      return;
    }

    setIsSaving(true);
    const previousFunds = queryClient.getQueryData<FundSummary[]>(fundsKey);
    const optimisticId = `optimistic-fund-${Date.now()}`;
    const optimisticFund: FundSummary = {
      id: optimisticId,
      name: name.trim(),
      description: description.trim() || null,
      type: fundType as FundSummary["type"],
      allowedCategories: categories,
      isDefault: false,
      totalDonations: 0,
      totalExpenses: 0,
      balance: 0,
      donationCount: 0,
      expenseCount: 0,
      deletedAt: null,
    };
    queryClient.setQueryData<FundSummary[]>(fundsKey, (prev = []) => [
      optimisticFund,
      ...prev,
    ]);
    try {
      await fundsService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        type: fundType,
        categories,
      });
      toast.success("Fund created successfully");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      queryClient.setQueryData(fundsKey, previousFunds);
      toast.error(getErrorMessage(error, "Failed to create fund"));
    } finally {
      await invalidateFundsQueries(queryClient, mosqueId);
      await invalidateMosqueLiveQueries(queryClient, mosqueId);
      setIsSaving(false);
    }
  };

  const openEditModal = (fund: FundSummary) => {
    if (!canEdit) return;
    setEditId(fund.id);
    setName(fund.name);
    setDescription(fund.description ?? "");
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!canEdit) return;
    if (!editId || !validateForm()) return;

    setIsSaving(true);
    const previousFunds = queryClient.getQueryData<FundSummary[]>(fundsKey);
    queryClient.setQueryData<FundSummary[]>(fundsKey, (prev = []) =>
      prev.map((item) =>
        item.id === editId
          ? {
              ...item,
              name: name.trim(),
              description: description.trim() || null,
            }
          : item,
      ),
    );
    try {
      await fundsService.update(editId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Fund updated successfully");
      setIsEditOpen(false);
      setEditId(null);
      resetForm();
    } catch (error) {
      queryClient.setQueryData(fundsKey, previousFunds);
      toast.error(getErrorMessage(error, "Failed to update fund"));
    } finally {
      await invalidateFundsQueries(queryClient, mosqueId);
      await invalidateMosqueLiveQueries(queryClient, mosqueId);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!deleteTargetId) return;

    setIsDeleting(true);
    const previousFunds = queryClient.getQueryData<FundSummary[]>(fundsKey);
    const previousInactiveFunds =
      queryClient.getQueryData<any[]>(inactiveFundsKey);
    const deletingFund = (previousFunds ?? []).find(
      (item) => item.id === deleteTargetId,
    );
    queryClient.setQueryData<FundSummary[]>(fundsKey, (prev = []) =>
      prev.filter((item) => item.id !== deleteTargetId),
    );
    if (deletingFund) {
      queryClient.setQueryData<any[]>(inactiveFundsKey, (prev = []) => [
        {
          ...deletingFund,
          deletedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    try {
      await fundsService.delete(deleteTargetId);
      toast.success("Fund deactivated successfully");
      setDeleteTargetId(null);
    } catch (error) {
      queryClient.setQueryData(fundsKey, previousFunds);
      queryClient.setQueryData(inactiveFundsKey, previousInactiveFunds);
      const message = getErrorMessage(error, "Failed to deactivate fund");
      if (message.includes("transactions exist")) {
        toast.error("Fund could not be deactivated.");
      } else {
        toast.error(message);
      }
    } finally {
      await invalidateFundsQueries(queryClient, mosqueId);
      await invalidateMosqueLiveQueries(queryClient, mosqueId);
      setIsDeleting(false);
    }
  };

  const handleRestore = async (id: string) => {
    setRestoringFundId(id);
    const previousFunds = queryClient.getQueryData<FundSummary[]>(fundsKey);
    const previousInactiveFunds =
      queryClient.getQueryData<any[]>(inactiveFundsKey);
    const restoringFund = (previousInactiveFunds ?? []).find(
      (item) => item.id === id,
    );
    queryClient.setQueryData<any[]>(inactiveFundsKey, (prev = []) =>
      prev.filter((item) => item.id !== id),
    );
    if (restoringFund) {
      queryClient.setQueryData<FundSummary[]>(fundsKey, (prev = []) => [
        {
          ...restoringFund,
          deletedAt: null,
        },
        ...prev,
      ]);
    }
    try {
      await fundsService.restore(id);
      toast.success("Fund restored successfully");
    } catch (error) {
      queryClient.setQueryData(fundsKey, previousFunds);
      queryClient.setQueryData(inactiveFundsKey, previousInactiveFunds);
      toast.error(getErrorMessage(error, "Failed to restore fund"));
    } finally {
      await invalidateFundsQueries(queryClient, mosqueId);
      await invalidateMosqueLiveQueries(queryClient, mosqueId);
      setRestoringFundId(null);
    }
  };

  const activeFunds = useMemo(
    () => funds.filter((fund) => !fund.deletedAt),
    [funds],
  );

  const sortedFunds = useMemo(
    () => [...activeFunds].sort((a, b) => b.balance - a.balance),
    [activeFunds],
  );

  const topFund = sortedFunds[0] ?? null;

  const filteredFunds = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    const min = Number(minBalance);
    const hasMin = minBalance.trim().length > 0 && Number.isFinite(min);

    return sortedFunds.filter((fund) => {
      const matchesName =
        normalizedSearch.length === 0 ||
        fund.name.toLowerCase().includes(normalizedSearch) ||
        (fund.description ?? "").toLowerCase().includes(normalizedSearch);

      const matchesMin = !hasMin || fund.balance >= min;
      return matchesName && matchesMin;
    });
  }, [sortedFunds, debouncedSearchTerm, minBalance]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = filteredFunds.slice(0, EXPORT_MAX_ROWS);
      await downloadPdfExport({
        filename: `funds-${Date.now()}.pdf`,
        title: "Funds Export",
        rows,
        columns: [
          { header: "Fund Name", value: (row) => row.name },
          { header: "Type", value: (row) => row.type },
          { header: "Description", value: (row) => row.description ?? "-" },
          {
            header: "Total Donations",
            value: (row) => formatCurrency(row.totalDonations),
          },
          {
            header: "Total Expenses",
            value: (row) => formatCurrency(row.totalExpenses),
          },
          { header: "Balance", value: (row) => formatCurrency(row.balance) },
          { header: "Donation Count", value: (row) => row.donationCount },
          { header: "Expense Count", value: (row) => row.expenseCount },
        ],
      });

      if (filteredFunds.length > EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to export funds"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden px-2">
      <PageHeader
        title="Funds"
        description="Manage donation categories for your mosque."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return;
              resetForm();
              setIsCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Fund
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </PageHeader>

      {fundsQuery.isLoading ? (
        <div className="ds-stack">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      ) : fundsQuery.error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-600">
            {getErrorMessage(fundsQuery.error, "Failed to load funds")}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fundsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : activeFunds.length === 0 ? (
        <ListEmptyState
          title="No funds created yet"
          description="Create your first fund to start tracking finances"
          actionLabel={canCreate ? "Create Fund" : undefined}
          onAction={
            canCreate
              ? () => {
                  resetForm();
                  setIsCreateOpen(true);
                }
              : undefined
          }
          icon={<Wallet className="h-5 w-5" />}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground/80">Total Funds</p>
                <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                  <Layers3 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold leading-none text-foreground">
                {activeFunds.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                System fund buckets configured
              </p>
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fund-search">Search Funds</Label>
              <Input
                id="fund-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or description"
              />
            </div>
            {/* <div className="space-y-1">
                  <Label htmlFor="fund-min-balance">Min Balance</Label>
                  <Input
                    id="fund-min-balance"
                    type="text"
                    inputMode="decimal"
                    pattern="^\d+(?:\.\d{1,2})?$"
                    step="0.01"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </div> */}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredFunds.map((fund) => {
              const utilizationPercentage =
                fund.totalDonations > 0
                  ? Math.min(
                      (fund.totalExpenses / fund.totalDonations) * 100,
                      100,
                    )
                  : 0;
              const isTopFund = topFund?.id === fund.id;

              return (
                <Card
                  key={fund.id}
                  className="cursor-pointer rounded-xl border border-border/70 bg-muted/20 shadow-sm transition-colors hover:bg-muted/35"
                  onClick={() => router.push(`/dashboard/funds/${fund.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/dashboard/funds/${fund.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-md font-semibold text-foreground sm:text-base">
                          {fund.name}
                        </p>
                        {isTopFund ? (
                          <Badge className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                            Top Fund
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Wallet
                          className="h-3.5 w-3.5 text-muted-foreground/70"
                          aria-hidden="true"
                        />
                        <p
                          className={`max-w-full shrink-0 truncate text-base font-bold text-emerald-700 md:text-lg ${fund.balance < 0 ? "text-rose-700" : ""}`}
                        >
                          {formatCurrency(fund.balance)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 overflow-hidden text-[12px] font-semibold sm:text-sm">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-green-600">
                        <ArrowDownRight
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          Collected {formatCurrency(fund.totalDonations)}
                        </span>
                      </p>
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-red-500">
                        <ArrowUpRight
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          Expenses {formatCurrency(fund.totalExpenses)}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-500">Fund Utilization</span>
                        <span className="font-medium text-foreground">
                          {Math.round(utilizationPercentage)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-rose-400"
                          style={{ width: `${utilizationPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-md px-3 text-sm"
                        disabled={!canEdit}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canEdit) return;
                          openEditModal(fund);
                        }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-md border-rose-200 px-3 text-sm text-rose-700 hover:bg-rose-50"
                        disabled={!canDelete}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canDelete) return;
                          setDeleteTargetId(fund.id);
                        }}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredFunds.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No funds match the current filters.
            </p>
          ) : null}

          <div className="mt-8 border-t pt-4 px-3 rounded-2xl pb-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Inactive Funds
                </p>
                <p className="text-xs text-muted-foreground">
                  Deactivated funds can be enabled again.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInactiveFunds((value) => !value)}
              >
                {showInactiveFunds
                  ? "Hide Inactive"
                  : `Show Inactive (${inactiveFunds.length})`}
              </Button>
            </div>

            {showInactiveFunds ? (
              inactiveFunds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No inactive funds.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {inactiveFunds.map((fund) => (
                    <Card key={fund.id} className="border-border">
                      <CardContent className="flex items-center justify-between gap-3 pt-5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {fund.name}
                            </p>
                            <Badge variant="secondary">Inactive</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fund.description || "No description added"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleRestore(fund.id)}
                          disabled={restoringFundId === fund.id}
                        >
                          {restoringFundId === fund.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                          )}
                          Enable Fund
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : null}
          </div>
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Fund</DialogTitle>
            <DialogDescription>
              Add a new donation category for your mosque.
            </DialogDescription>
          </DialogHeader>
          <div className="ds-stack">
            <div className="space-y-2">
              <Label htmlFor="create-fund-name">Fund Name</Label>
              <Input
                id="create-fund-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramadan Fund"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-fund-description">
                Description (Optional)
              </Label>
              <Textarea
                id="create-fund-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-fund-type">Fund Type</Label>
              <p className="text-xs text-muted-foreground">
                Fund type defines rules. Use fund name to describe purpose
                (e.g., Darul Uloom Fund).
              </p>
              <select
                id="create-fund-type"
                value={fundType}
                onChange={(e) =>
                  setFundType(
                    e.target.value as
                      | "MASJID"
                      | "BAITUL_MAAL"
                      | "ZAKAT"
                      | "SADAQAH",
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="MASJID">MASJID</option>
                <option value="BAITUL_MAAL">BAITUL_MAAL</option>
                <option value="SADAQAH">SADAQAH</option>
                <option value="ZAKAT">ZAKAT</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="Add category (e.g. iftar)"
                  disabled={!canCreate}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCategory}
                  disabled={!canCreate}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                "other" is always included. You can add up to 5 additional
                categories.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSaving || !canCreate}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fund</DialogTitle>
            <DialogDescription>
              Update fund details for your mosque.
            </DialogDescription>
          </DialogHeader>
          <div className="ds-stack">
            <div className="space-y-2">
              <Label htmlFor="edit-fund-name">Fund Name</Label>
              <Input
                id="edit-fund-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fund-description">Description</Label>
              <Textarea
                id="edit-fund-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !canEdit}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to deactivate this fund? It will no longer
              be usable for new transactions, but existing records will remain
              intact.
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can continue viewing historical donations and expenses linked
              to this fund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Deactivate Fund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
