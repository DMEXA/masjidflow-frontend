'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DashboardLayout from '@/app/dashboard/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import { Download, Loader2, SlidersHorizontal } from 'lucide-react';
import {
  trashService,
  type TrashDonationItem,
  type TrashExpenseItem,
  type TrashMemberItem,
  type TrashResponse,
  type TrashType,
} from '@/services/trash.service';
import { TrashActionButtons } from '@/components/trash/trash-action-buttons';

const PAGE_SIZE = 10;

export default function TrashPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = usePermission();

  const [type, setType] = useState<TrashType>('members');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkRestoring, setIsBulkRestoring] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<
    | { mode: 'single'; id: string; type: TrashType }
    | { mode: 'bulk'; ids: string[]; type: TrashType }
    | null
  >(null);

  const canAccess = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router]);

  if (!canAccess) {
    return null;
  }

  const trashQuery = useQuery({
    queryKey: ['trash', type, page],
    queryFn: async () => trashService.getTrash(type, page, PAGE_SIZE),
    enabled: canAccess,
  });

  const data = trashQuery.data as TrashResponse<TrashMemberItem | TrashDonationItem | TrashExpenseItem> | undefined;
  const items = data?.data ?? [];
  const meta = data?.meta;
  const currentPageIds = useMemo(() => items.map((item) => item.id), [items]);

  const totalPages = useMemo(() => {
    if (!meta) return 1;
    return Math.max(1, Math.ceil(meta.total / meta.limit));
  }, [meta]);

  const handleTypeChange = (nextType: string) => {
    setType(nextType as TrashType);
    setPage(1);
  };

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedIds([]);
      return next;
    });
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [type, page, trashQuery.dataUpdatedAt]);

  const roleClass = (role?: string | null) => {
    const roleText = (role ?? '').toUpperCase();
    if (roleText === 'SUPER_ADMIN') return 'bg-emerald-100 text-emerald-800';
    if (roleText === 'ADMIN') return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

  const cardMeta = (item: TrashMemberItem | TrashDonationItem | TrashExpenseItem) => {
    const raw = item as any;
    const addedByName =
      raw.createdByName ??
      raw.user?.name ??
      raw.donorName;
    const addedByRole = raw.createdByRole ?? raw.userRole ?? null;
    const deletedByName = raw.deletedByName ?? null;
    const deletedByRole = raw.deletedByRole ?? null;

    const amount =
      type === 'members'
        ? '-'
        : formatCurrency(Number(raw.amount ?? 0));

    const categoryLabel = type === 'donations' ? 'Donation' : type === 'expenses' ? 'Expense' : 'Member';

    const rightMeta =
      type === 'donations'
        ? raw.fundType ?? null
        : type === 'expenses'
          ? raw.category ?? raw.description ?? null
          : raw.user?.email ?? null;

    return {
      addedByName,
      addedByRole,
      deletedByName,
      deletedByRole,
      amount,
      categoryLabel,
      rightMeta,
    };
  };

  const formatDeletedAgo = (value: string | null) => {
    if (!value) return 'Deleted recently';
    const deletedDate = new Date(value);
    const now = Date.now();
    const diffMs = now - deletedDate.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'Deleted recently';

    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return 'Deleted just now';
    if (minutes < 60) return `Deleted ${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const days = Math.floor(minutes / (60 * 24));
    if (days < 1) {
      const hours = Math.floor(minutes / 60);
      return `Deleted ${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    return `Deleted ${days} day${days === 1 ? '' : 's'} ago`;
  };

  const runRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await trashService.restore(type, id);
      toast.success('Item restored successfully');
      await queryClient.invalidateQueries({
        queryKey: ['trash'],
        exact: false,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to restore item'));
    } finally {
      setRestoringId(null);
    }
  };

  const runPermanentDelete = async (id: string, targetType: TrashType) => {
    setDeletingId(id);
    try {
      await trashService.permanentDelete(targetType, id);
      toast.success('Item permanently deleted');
      await queryClient.invalidateQueries({
        queryKey: ['trash'],
        exact: false,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to permanently delete item'));
    } finally {
      setDeletingId(null);
    }
  };

  const runBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkRestoring(true);
    try {
      await Promise.all(
        selectedIds.map((id) => trashService.restore(type, id)),
      );
      toast.success('Selected items restored successfully');
      setSelectedIds([]);
      await queryClient.invalidateQueries({
        queryKey: ['trash'],
        exact: false,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to restore selected items'));
    } finally {
      setIsBulkRestoring(false);
    }
  };

  const runBulkPermanentDelete = async (ids: string[], targetType: TrashType) => {
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        ids.map((id) => trashService.permanentDelete(targetType, id)),
      );
      toast.success('Selected items permanently deleted');
      setSelectedIds([]);
      await queryClient.invalidateQueries({
        queryKey: ['trash'],
        exact: false,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to permanently delete selected items'));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!canAccess) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Trash</h1>
          <p className="text-sm text-muted-foreground">Review deleted records, restore them, or permanently remove them.</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center">
              <Tabs value={type} onValueChange={handleTypeChange}>
                <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="donations">Donations</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Input
                placeholder="Search..."
                className="h-9 max-w-[240px] rounded-md"
                disabled
              />
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-md px-3" onClick={toggleSelectionMode}>
                  {isSelectionMode ? 'Done' : 'Select'}
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md" disabled>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isSelectionMode ? (
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">Selected: {selectedIds.length}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBulkRestoring || isBulkDeleting || trashQuery.isFetching}
                    onClick={runBulkRestore}
                  >
                    {isBulkRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Restore Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    disabled={isBulkRestoring || isBulkDeleting || trashQuery.isFetching}
                    onClick={() => setPendingPermanentDelete({ mode: 'bulk', ids: selectedIds, type })}
                  >
                    {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBulkRestoring || isBulkDeleting || trashQuery.isFetching}
                    onClick={() => setSelectedIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}

            {trashQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading trash records...
              </div>
            ) : trashQuery.isError ? (
              <div className="text-sm text-red-600">{getErrorMessage(trashQuery.error, 'Failed to load trash items')}</div>
            ) : items.length === 0 ? (
              <ListEmptyState
                title="No items in trash"
                description="No deleted records for this type."
                actionLabel="Back To Dashboard"
                actionHref="/dashboard"
                className="min-h-40"
              />
            ) : (
              <>
                <div className="space-y-2">
                  {items.map((item) => {
                    const metaInfo = cardMeta(item);
                    const isSelected = selectedIds.includes(item.id);
                    const highlightClass = type === 'expenses'
                      ? 'border-red-300 bg-red-50/40'
                      : 'border-emerald-300 bg-emerald-50/40';

                    return (
                      <Card
                        key={item.id}
                        className={`rounded-lg ${isSelectionMode && isSelected ? highlightClass : ''}`}
                      >
                        <CardContent
                          className={`space-y-2 px-1 ${isSelectionMode ? 'py-2' : 'py-2.5'}`}
                          onClick={() => {
                            if (!isSelectionMode) return;
                            toggleSelect(item.id);
                          }}
                        >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-1.5">
                            {isSelectionMode ? (
                              <Checkbox
                                checked={isSelected}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(item.id);
                                }}
                                className="mt-0.5"
                              />
                            ) : null}
                            <p className="max-w-[150px] truncate text-sm text-muted-foreground sm:max-w-[220px]">Added: {metaInfo.addedByName ?? 'Unknown'}</p>
                            {metaInfo.addedByRole ? (
                              <Badge variant="secondary" className={`rounded px-2 py-0.5 text-[10px] leading-none ${roleClass(metaInfo.addedByRole)}`}>
                                {metaInfo.addedByRole.toUpperCase().slice(0,5)}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-foreground">{metaInfo.amount}</p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="max-w-[150px] truncate text-xs text-muted-foreground sm:max-w-[220px]">Deleted: {metaInfo.deletedByName ?? 'Unknown'}</p>
                            {metaInfo.deletedByRole ? (
                              <Badge variant="secondary" className={`rounded px-2 py-0.5 text-[10px] leading-none ${roleClass(metaInfo.deletedByRole)}`}>
                                {metaInfo.deletedByRole.toUpperCase().slice(0,5)}
                              </Badge>
                            ) : null}
                          </div>
                          <Badge variant="outline" className="h-5 rounded-md px-2 text-[10px]">{metaInfo.categoryLabel.slice(0, 3)}</Badge>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <p>{formatDeletedAgo(item.deletedAt)}</p>
                          <p className="truncate text-right">{metaInfo.rightMeta ?? 'Unknown'}</p>
                        </div>

                        {!isSelectionMode ? (
                          <div className="pt-0.5">
                            <TrashActionButtons
                              restoring={restoringId === item.id}
                              deleting={deletingId === item.id}
                              onRestore={() => runRestore(item.id)}
                              onPermanentDelete={() => setPendingPermanentDelete({ mode: 'single', id: item.id, type })}
                            />
                          </div>
                        ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1 || trashQuery.isFetching}
                  >
                    Prev
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Page {meta?.page ?? page} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page >= totalPages || trashQuery.isFetching}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={Boolean(pendingPermanentDelete)}
          onOpenChange={(open) => {
            if (!open && !deletingId) {
              setPendingPermanentDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently delete items?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Items will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(deletingId || isBulkDeleting)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!pendingPermanentDelete || Boolean(deletingId || isBulkDeleting)}
                onClick={(e) => {
                  e.preventDefault();
                  if (!pendingPermanentDelete) return;

                  const run =
                    pendingPermanentDelete.mode === 'bulk'
                      ? runBulkPermanentDelete(pendingPermanentDelete.ids, pendingPermanentDelete.type)
                      : runPermanentDelete(pendingPermanentDelete.id, pendingPermanentDelete.type);

                  run.finally(() => setPendingPermanentDelete(null));
                }}
              >
                {deletingId || isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {pendingPermanentDelete?.mode === 'bulk' ? 'Delete Selected' : 'Permanent Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
