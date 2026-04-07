'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  platformAdminService,
  type PaginationMeta,
  type PlatformDeletedMosqueRow,
} from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatDateTime } from '@/src/utils/format';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformTrashPage() {
  const [rows, setRows] = useState<PlatformDeletedMosqueRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [actingMosqueId, setActingMosqueId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await platformAdminService.getDeletedMosques({ page, limit: 20 });
      setRows(response.data);
      setMeta(response.meta);
      setSelectedIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load trash'));
    } finally {
      setLoading(false);
    }
  };

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

  const bulkRestore = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one mosque');
      return;
    }
    try {
      await platformAdminService.bulkRestoreMosques(selectedIds);
      toast.success('Selected mosques restored');
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to bulk restore mosques'));
    }
  };

  const bulkPermanentDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one mosque');
      return;
    }
    try {
      await platformAdminService.bulkPermanentlyDeleteMosques(selectedIds);
      toast.success('Selected mosques permanently deleted');
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to bulk permanently delete mosques'));
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const restore = async (row: PlatformDeletedMosqueRow) => {
    setActingMosqueId(row.id);
    try {
      await platformAdminService.restoreMosque(row.id);
      toast.success('Mosque restored');
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to restore mosque'));
    } finally {
      setActingMosqueId(null);
    }
  };

  const permanentlyDelete = async (row: PlatformDeletedMosqueRow) => {
    setActingMosqueId(row.id);
    try {
      await platformAdminService.permanentlyDeleteMosque(row.id);
      toast.success('Mosque permanently deleted');
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to permanently delete mosque'));
    } finally {
      setActingMosqueId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Trash" description="Restore or permanently delete soft-deleted mosques" />
      <Card>
        <CardHeader>
          <CardTitle>Deleted Mosques</CardTitle>
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
            <Button size="sm" disabled={selectedIds.length === 0 || loading} onClick={bulkRestore}>
              Restore Selected ({selectedIds.length})
            </Button>
            <Button size="sm" variant="destructive" disabled={selectedIds.length === 0 || loading} onClick={bulkPermanentDelete}>
              Delete Selected Forever ({selectedIds.length})
            </Button>
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            ) : rows.length === 0 ? (
              <ListEmptyState
                title="Trash is empty"
                description="Deleted mosques will appear here for restore or permanent removal."
                actionLabel="View Mosques"
                actionHref="/platform/mosques"
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
                          <Badge variant="secondary" className="text-xs">Deleted</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{row.adminEmail ?? '-'}</p>
                        <p className="text-xs text-muted-foreground">{row.deletedAt ? formatDateTime(row.deletedAt) : '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => restore(row)} disabled={busy}>Restore</Button>
                        <Button size="sm" variant="destructive" onClick={() => permanentlyDelete(row)} disabled={busy}>
                          Delete Forever
                        </Button>
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
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Deleted</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4">
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4">
                      <ListEmptyState
                        title="Trash is empty"
                        description="Deleted mosques will appear here for restore or permanent removal."
                        actionLabel="View Mosques"
                        actionHref="/platform/mosques"
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
                        <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2">{row.deletedAt ? formatDateTime(row.deletedAt) : '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => restore(row)} disabled={busy}>Restore</Button>
                            <Button size="sm" variant="destructive" onClick={() => permanentlyDelete(row)} disabled={busy}>
                              Delete Forever
                            </Button>
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
              <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage || loading} onClick={() => load(meta.page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNextPage || loading} onClick={() => load(meta.page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
