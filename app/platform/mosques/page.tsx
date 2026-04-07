'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  platformAdminService,
  type PaginationMeta,
  type PlatformMosqueRow,
} from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatDateTime } from '@/src/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSafeLimit } from '@/src/utils/pagination';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { ListEmptyState } from '@/components/common/list-empty-state';
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

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformMosquesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [actingMosqueId, setActingMosqueId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteMosqueId, setConfirmDeleteMosqueId] = useState<string | null>(null);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const pageLimit = getSafeLimit(20);

  const mosquesQuery = useQuery<{ data: PlatformMosqueRow[]; meta: PaginationMeta }>({
    queryKey: queryKeys.platformMosques({ page, limit: pageLimit, search: '', status: 'all' }),
    queryFn: () => platformAdminService.getMosques({ page, limit: pageLimit }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rows = mosquesQuery.data?.data ?? [];
  const meta = mosquesQuery.data?.meta ?? EMPTY_META;
  const loading = mosquesQuery.isLoading;

  const invalidateMosques = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform-mosques'] });
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => platformAdminService.bulkDeleteMosques(ids),
    onSuccess: invalidateMosques,
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => platformAdminService.suspendMosque(id),
    onSuccess: invalidateMosques,
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => platformAdminService.activateMosque(id),
    onSuccess: invalidateMosques,
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => platformAdminService.deleteMosque(id),
    onSuccess: invalidateMosques,
  });

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id),
    );
  };

  const toggleSelectAllCurrentPage = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.id));
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one mosque');
      return;
    }
    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      toast.success('Selected mosques deleted');
      setSelectedIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to bulk delete mosques'));
    }
  };

  const suspend = async (row: PlatformMosqueRow) => {
    setActingMosqueId(row.id);
    try {
      await suspendMutation.mutateAsync(row.id);
      toast.success('Mosque suspended');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to suspend mosque'));
    } finally {
      setActingMosqueId(null);
    }
  };

  const activate = async (row: PlatformMosqueRow) => {
    setActingMosqueId(row.id);
    try {
      await activateMutation.mutateAsync(row.id);
      toast.success('Mosque activated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to activate mosque'));
    } finally {
      setActingMosqueId(null);
    }
  };

  const softDelete = async (row: PlatformMosqueRow) => {
    setActingMosqueId(row.id);
    try {
      await softDeleteMutation.mutateAsync(row.id);
      toast.success('Mosque deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete mosque'));
    } finally {
      setActingMosqueId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Mosques" description="All registered mosques with plan and status" />
      <Card>
        <CardHeader>
          <CardTitle>Mosques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={rows.length > 0 && selectedIds.length === rows.length}
                onCheckedChange={(value) => toggleSelectAllCurrentPage(Boolean(value))}
              />
              <span className="text-sm text-muted-foreground">Select all on page</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.length === 0 || loading || bulkDeleteMutation.isPending}
              onClick={() => setConfirmBulkDeleteOpen(true)}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            ) : rows.length === 0 ? (
              <ListEmptyState
                title="No mosques found"
                description="Create a mosque from admin setup to start managing it here."
                actionLabel="Open Admin Mosques"
                actionHref="/admin/mosques"
                className="min-h-40"
              />
            ) : (
              rows.map((row) => {
                const busy = actingMosqueId === row.id;
                return (
                  <Card key={row.id} className="border-border">
                    <CardContent className="space-y-3 pt-4">
                      <div className="space-y-2">
                        <div className="mb-2 flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.includes(row.id)}
                            onCheckedChange={(value) => toggleSelected(row.id, Boolean(value))}
                          />
                          <span className="text-xs text-muted-foreground">Select</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-semibold text-foreground">{row.name}</p>
                          <Badge variant={row.isSuspended ? 'secondary' : 'default'} className="text-xs">
                            {row.isSuspended ? 'Suspended' : 'Active'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{row.adminEmail ?? '-'}</p>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>Users: {row.userCount} â€¢ Plan: {row.plan}</span>
                          <span>{formatDateTime(row.createdAt)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/platform/mosques/${row.id}`}>Details</Link>
                        </Button>
                        <ActionOverflowMenu
                          items={[
                            { label: 'Payments', onSelect: () => router.push(`/platform/payments?mosqueId=${encodeURIComponent(row.id)}`) },
                            row.isSuspended
                              ? { label: busy ? 'Activating...' : 'Activate', onSelect: () => activate(row) }
                              : { label: busy ? 'Suspending...' : 'Suspend', onSelect: () => suspend(row) },
                            { label: 'Delete', onSelect: () => setConfirmDeleteMosqueId(row.id), destructive: true },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Mosque</th>
                  <th className="px-3 py-2">Admin Email</th>
                  <th className="px-3 py-2">Users</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4">
                      <ListEmptyState
                        title="No mosques found"
                        description="Create a mosque from admin setup to start managing it here."
                        actionLabel="Open Admin Mosques"
                        actionHref="/admin/mosques"
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const busy = actingMosqueId === row.id;
                    return (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selectedIds.includes(row.id)}
                            onCheckedChange={(value) => toggleSelected(row.id, Boolean(value))}
                          />
                        </td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.adminEmail ?? '-'}</td>
                        <td className="px-3 py-2">{row.userCount}</td>
                        <td className="px-3 py-2">{row.plan}</td>
                        <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2">{row.isSuspended ? 'Suspended' : 'Active'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/platform/mosques/${row.id}`}>Details</Link>
                            </Button>
                            <ActionOverflowMenu
                              items={[
                                { label: 'Payments', onSelect: () => router.push(`/platform/payments?mosqueId=${encodeURIComponent(row.id)}`) },
                                row.isSuspended
                                  ? { label: busy ? 'Activating...' : 'Activate', onSelect: () => activate(row) }
                                  : { label: busy ? 'Suspending...' : 'Suspend', onSelect: () => suspend(row) },
                                { label: 'Delete', onSelect: () => setConfirmDeleteMosqueId(row.id), destructive: true },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {meta.page} of {Math.max(meta.totalPages, 1)}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage || loading} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNextPage || loading} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>

          <AlertDialog
            open={Boolean(confirmDeleteMosqueId)}
            onOpenChange={(open) => {
              if (!open && !actingMosqueId) {
                setConfirmDeleteMosqueId(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete this mosque and move it to Trash.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={Boolean(actingMosqueId)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!confirmDeleteMosqueId || Boolean(actingMosqueId)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!confirmDeleteMosqueId) return;
                    const row = rows.find((item) => item.id === confirmDeleteMosqueId);
                    if (!row) return;
                    softDelete(row).finally(() => {
                      setConfirmDeleteMosqueId(null);
                    });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={confirmBulkDeleteOpen}
            onOpenChange={(open) => {
              if (!bulkDeleteMutation.isPending) {
                setConfirmBulkDeleteOpen(open);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete {selectedIds.length} selected mosque{selectedIds.length === 1 ? '' : 's'}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    bulkDelete().finally(() => {
                      setConfirmBulkDeleteOpen(false);
                    });
                  }}
                >
                  Delete Selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}


