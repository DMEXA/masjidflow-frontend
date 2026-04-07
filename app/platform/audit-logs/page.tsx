'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import {
  platformAdminService,
  type PaginationMeta,
  type PlatformAuditLogRow,
} from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatDateTime } from '@/src/utils/format';
import { collectPaginatedExportRows, exportToPDF, EXPORT_MAX_ROWS } from '@/src/utils/export';
import { ListEmptyState } from '@/components/common/list-empty-state';

const EMPTY_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function PlatformAuditLogsPage() {
  const [rows, setRows] = useState<PlatformAuditLogRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const load = async (page: number) => {
    setLoading(true);
    try {
      const response = await platformAdminService.getGlobalAuditLogs({ page, limit: 20 });
      setRows(response.data);
      setMeta(response.meta);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load platform audit logs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allRows = await collectPaginatedExportRows<PlatformAuditLogRow>({
        maxRows: EXPORT_MAX_ROWS,
        chunkSize: 100,
        fetchPage: async (page, limit) => {
          const response = await platformAdminService.getGlobalAuditLogs({ page, limit });
          return {
            data: response.data,
            page: response.meta.page,
            totalPages: response.meta.totalPages,
          };
        },
      });

      if (!allRows.length) {
        toast.error('No platform audit logs available to export');
        return;
      }

      await exportToPDF({
        data: allRows.slice(0, 500),
        filename: `platform-audit-${Date.now()}.pdf`,
        title: 'Platform Audit Logs',
        columns: [
          { header: 'ID', value: (row) => row.id },
          { header: 'Action', value: (row) => row.action },
          { header: 'Entity', value: (row) => row.entity },
          { header: 'User', value: (row) => row.userName },
          { header: 'Timestamp', value: (row) => formatDateTime(row.createdAt) },
        ],
      });

      if (allRows.length > EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export platform audit logs'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Logs"
        description="Cross-mosque administrative activity"
      >
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export PDF
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Global Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Mosque</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-muted-foreground">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4">
                      <ListEmptyState
                        title="No logs found"
                        description="Platform activity will appear here once events are recorded."
                        actionLabel="Reload Logs"
                        onAction={() => load(1)}
                        className="min-h-36"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2">{row.mosqueName}</td>
                      <td className="px-3 py-2">{row.userName}</td>
                      <td className="px-3 py-2">{row.action}</td>
                      <td className="px-3 py-2">{row.entity}</td>
                    </tr>
                  ))
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
