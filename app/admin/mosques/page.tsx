'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { platformAdminService, type PlatformMosqueRow, type PaginationMeta } from '@/services/platform-admin.service';
import { formatDateTime } from '@/src/utils/format';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformAdminMosquesPage() {
  const [rows, setRows] = useState<PlatformMosqueRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await platformAdminService.getMosques({ page, limit: 20 });
      setRows(response.data);
      setMeta(response.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const handleSuspend = async (mosqueId: string) => {
    setActionId(mosqueId);
    try {
      const result = await platformAdminService.suspendMosque(mosqueId);
      toast.success(result.message);
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to suspend mosque'));
    } finally {
      setActionId(null);
    }
  };

  const handleActivate = async (mosqueId: string) => {
    setActionId(mosqueId);
    try {
      const result = await platformAdminService.activateMosque(mosqueId);
      toast.success(result.message);
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to activate mosque'));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (mosqueId: string) => {
    setActionId(mosqueId);
    try {
      const result = await platformAdminService.deleteMosque(mosqueId);
      toast.success(result.message);
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete mosque'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Mosques"
        description="Paginated list of mosques across the platform"
      />

      <Card>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="ds-section font-medium">Mosque</th>
                  <th className="ds-section font-medium">Admin Email</th>
                  <th className="ds-section font-medium">Users</th>
                  <th className="ds-section font-medium">Plan</th>
                  <th className="ds-section font-medium">Created</th>
                  <th className="ds-section font-medium">Status</th>
                  <th className="ds-section font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-4 py-6" colSpan={7}>
                      <div className="animate-pulse space-y-2">
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                        <div className="h-10 rounded-xl bg-muted" />
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6" colSpan={7}>
                      <ListEmptyState
                        title="No mosques found"
                        description="Refresh to check for newly registered mosques."
                        actionLabel="Reload List"
                        onAction={() => load(1)}
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="ds-section">{row.name}</td>
                      <td className="ds-section">{row.adminEmail ?? 'N/A'}</td>
                      <td className="ds-section">{row.userCount}</td>
                      <td className="ds-section">{row.plan}</td>
                      <td className="ds-section">{formatDateTime(row.createdAt)}</td>
                      <td className="ds-section">{row.isSuspended ? 'Suspended' : 'Active'}</td>
                      <td className="ds-section">
                        <div className="flex flex-wrap gap-2">
                          {row.isSuspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionId === row.id}
                              onClick={() => handleActivate(row.id)}
                            >
                              Activate Mosque
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionId === row.id}
                              onClick={() => handleSuspend(row.id)}
                            >
                              Suspend Mosque
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionId === row.id}
                            onClick={() => setConfirmDeleteId(row.id)}
                          >
                            Delete Mosque
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {loading && (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            )}
            {!loading && rows.length === 0 && (
              <ListEmptyState
                title="No mosques found"
                description="Refresh to check for newly registered mosques."
                actionLabel="Reload List"
                onAction={() => load(1)}
                className="min-h-40"
              />
            )}
            {!loading &&
              rows.map((row) => (
                <Card key={row.id} className="border-border">
                  <CardContent className="space-y-3 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.adminEmail ?? 'N/A'}</p>
                      </div>
                      <Badge variant={row.isSuspended ? 'secondary' : 'default'} className="text-xs">
                        {row.isSuspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <p>Users: {row.userCount} • Plan: {row.plan}</p>
                      <p>{formatDateTime(row.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.isSuspended ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === row.id}
                          onClick={() => handleActivate(row.id)}
                        >
                          Activate Mosque
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionId === row.id}
                          onClick={() => handleSuspend(row.id)}
                        >
                          Suspend Mosque
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionId === row.id}
                        onClick={() => setConfirmDeleteId(row.id)}
                      >
                        Delete Mosque
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {meta.page} of {Math.max(meta.totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!meta.hasPreviousPage || loading}
            onClick={() => load(meta.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!meta.hasNextPage || loading}
            onClick={() => load(meta.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open && !actionId) {
            setConfirmDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this mosque. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(actionId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmDeleteId || Boolean(actionId)}
              onClick={(e) => {
                e.preventDefault();
                if (!confirmDeleteId) return;
                handleDelete(confirmDeleteId).finally(() => {
                  setConfirmDeleteId(null);
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
