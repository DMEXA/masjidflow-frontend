'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { platformAdminService, type PlatformUserRow, type PaginationMeta } from '@/services/platform-admin.service';
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

export default function PlatformAdminUsersPage() {
  const [rows, setRows] = useState<PlatformUserRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await platformAdminService.getUsers({ page, limit: 20 });
      setRows(response.data);
      setMeta(response.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const handleDisable = async (userId: string) => {
    setActionId(userId);
    try {
      const result = await platformAdminService.disableUser(userId);
      toast.success(result.message);
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disable user'));
    } finally {
      setActionId(null);
    }
  };

  const handleEnable = async (userId: string) => {
    setActionId(userId);
    try {
      const result = await platformAdminService.enableUser(userId);
      toast.success(result.message);
      await load(meta.page);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to enable user'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Users"
        description="Users across mosques with their role and last login"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="ds-section font-medium">Name</th>
                  <th className="ds-section font-medium">Email</th>
                  <th className="ds-section font-medium">Mosque</th>
                  <th className="ds-section font-medium">Role</th>
                  <th className="ds-section font-medium">Last Login</th>
                  <th className="ds-section font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-4 py-6" colSpan={6}>
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
                    <td className="px-4 py-6" colSpan={6}>
                      <ListEmptyState
                        title="No users found"
                        description="Users appear here after they join a mosque."
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
                      <td className="ds-section">{row.email}</td>
                      <td className="ds-section">{row.mosque}</td>
                      <td className="ds-section">{row.role}</td>
                      <td className="ds-section">{row.lastLogin ? formatDateTime(row.lastLogin) : 'Never'}</td>
                      <td className="ds-section">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === row.userId}
                            onClick={() => handleDisable(row.userId)}
                          >
                            Disable User
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === row.userId}
                            onClick={() => handleEnable(row.userId)}
                          >
                            Enable User
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
    </div>
  );
}
