'use client';

import { Fragment, memo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { auditService } from '@/services/audit.service';
import type { AuditLogFilters } from '@/services/audit.service';
import type { AuditLog } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency, formatDateTime } from '@/src/utils/format';
import {
  collectPaginatedExportRows,
  downloadCsvExport,
  downloadPdfExport,
  EXPORT_MAX_ROWS,
} from '@/src/utils/export';
import { getErrorMessage } from '@/src/utils/error';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListEmptyState } from '@/components/common/list-empty-state';

// ── Constants ──────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'DONATION_CREATED', label: 'Donation Created' },
  { value: 'DONATION_VERIFIED', label: 'Donation Verified' },
  { value: 'DONATION_VERIFIED_BULK', label: 'Bulk Verified' },
  { value: 'DONATION_REJECTED', label: 'Donation Rejected' },
  { value: 'DONATION_PROOF_UPLOADED', label: 'Proof Uploaded' },
  { value: 'DONATION_TRANSACTION_UPDATED', label: 'Transaction Updated' },
  { value: 'DONATION_DUPLICATE_TRANSACTION_ATTEMPT', label: 'Duplicate Tx Attempt' },
  { value: 'DONATION_DELETED', label: 'Donation Deleted' },
  { value: 'DONATION_RESTORED', label: 'Donation Restored' },
  { value: 'EXPENSE_CREATED', label: 'Expense Created' },
  { value: 'EXPENSE_UPDATED', label: 'Expense Updated' },
  { value: 'EXPENSE_DELETED', label: 'Expense Deleted' },
  { value: 'EXPENSE_RESTORED', label: 'Expense Restored' },
  { value: 'MEMBER_INVITED', label: 'Member Invited' },
  { value: 'INVITE_ACCEPTED', label: 'Invite Accepted' },
  { value: 'INVITE_CANCELLED', label: 'Invite Cancelled' },
  { value: 'ROLE_CHANGED', label: 'Role Changed' },
  { value: 'RECONCILIATION_UPLOAD', label: 'Reconciliation Upload' },
  { value: 'WHATSAPP_REMINDER_SENT', label: 'WhatsApp Reminder' },
  { value: 'PAYMENT_SETTINGS_UPDATED', label: 'Payment Settings Updated' },
  { value: 'FAILED_LOGIN', label: 'Failed Login' },
  { value: 'REGISTER', label: 'Registration' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'DONATION', label: 'Donation' },
  { value: 'Expense', label: 'Expense' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'User', label: 'User' },
  { value: 'Settings', label: 'Settings' },
];

const FUND_OPTIONS = [
  { value: 'all', label: 'All Funds' },
  { value: 'MASJID', label: 'Masjid' },
  { value: 'ZAKAT', label: 'Zakat' },
  { value: 'BAITUL_MAAL', label: 'Baitul Maal' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

const ACTION_BADGE_COLORS: Record<string, string> = {
  DONATION_CREATED: 'bg-green-100 text-green-800',
  DONATION_VERIFIED: 'bg-emerald-100 text-emerald-800',
  DONATION_VERIFIED_BULK: 'bg-emerald-100 text-emerald-800',
  DONATION_REJECTED: 'bg-red-100 text-red-800',
  DONATION_PROOF_UPLOADED: 'bg-blue-100 text-blue-800',
  DONATION_TRANSACTION_UPDATED: 'bg-blue-100 text-blue-800',
  DONATION_DUPLICATE_TRANSACTION_ATTEMPT: 'bg-orange-100 text-orange-800',
  DONATION_DELETED: 'bg-red-100 text-red-800',
  DONATION_RESTORED: 'bg-sky-100 text-sky-800',
  EXPENSE_CREATED: 'bg-purple-100 text-purple-800',
  EXPENSE_UPDATED: 'bg-violet-100 text-violet-800',
  EXPENSE_DELETED: 'bg-red-100 text-red-800',
  EXPENSE_RESTORED: 'bg-sky-100 text-sky-800',
  EXPENSE_PERMANENTLY_DELETED: 'bg-red-200 text-red-900',
  MEMBER_INVITED: 'bg-indigo-100 text-indigo-800',
  INVITE_ACCEPTED: 'bg-teal-100 text-teal-800',
  INVITE_CANCELLED: 'bg-gray-100 text-gray-800',
  ROLE_CHANGED: 'bg-yellow-100 text-yellow-800',
  FAILED_LOGIN: 'bg-red-100 text-red-800',
  REGISTER: 'bg-green-100 text-green-800',
  PAYMENT_SETTINGS_UPDATED: 'bg-slate-100 text-slate-800',
  RECONCILIATION_UPLOAD: 'bg-cyan-100 text-cyan-800',
  WHATSAPP_REMINDER_SENT: 'bg-lime-100 text-lime-800',
  SCREENSHOT_UPLOAD_REJECTED: 'bg-orange-100 text-orange-800',
};

function toActionLabel(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function readAuditFund(details?: Record<string, unknown>): string {
  const v =
    details?.fundType ??
    details?.fund ??
    (details?.after as any)?.fundType ??
    (details?.after as any)?.fund;
  return typeof v === 'string' && v.length > 0 ? v : '-';
}

function readAuditAmount(details?: Record<string, unknown>): number | null {
  const direct = details?.amount ?? details?.totalAmount;
  if (typeof direct === 'number') return direct;
  const after = (details?.after as any)?.amount;
  if (typeof after === 'number') return after;
  const before = (details?.before as any)?.amount;
  if (typeof before === 'number') return before;
  return null;
}

function getAmountDisplay(log: AuditLog): string {
  const details = log.details;
  if (log.action === 'DONATION_VERIFIED_BULK' && details) {
    const verifiedCount = typeof details.verifiedCount === 'number' ? details.verifiedCount : null;
    const totalAmount = typeof details.totalAmount === 'number' ? details.totalAmount : null;
    const countText = verifiedCount === null ? 'Donations verified' : `${verifiedCount} donations verified`;
    const amountText = totalAmount === null ? '' : ` (${formatCurrency(totalAmount)})`;
    return `${countText}${amountText}`;
  }

  const amount = readAuditAmount(log.details);
  return amount === null ? '-' : formatCurrency(amount);
}

function formatPaymentType(value?: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '-';
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'UPI') return 'UPI';
  if (normalized === 'CASH') return 'CASH';
  if (normalized === 'BANK_TRANSFER' || normalized === 'BANKTRANSFER') return 'BANK_TRANSFER';
  return normalized;
}

function formatEntityLabel(log: AuditLog): string {
  const details = log.details;
  const entity = (log.entity ?? '').toLowerCase();

  if (entity === 'donation' || entity === 'donations') {
    return log.entityId ? `Donation #${log.entityId}` : log.entityLabel ?? 'Donation';
  }

  if (entity === 'expense' || entity === 'expenses') {
    return log.entityId ? `Expense #${log.entityId}` : log.entityLabel ?? 'Expense';
  }

  if (entity === 'invitation' || log.action.includes('INVITE')) {
    const email =
      typeof details?.email === 'string' && details.email.length > 0
        ? details.email
        : log.entityLabel;
    return email ? `Invite ${email}` : 'Invite';
  }

  if (entity === 'member' || entity === 'members') {
    const name =
      typeof log.entityLabel === 'string' && log.entityLabel.length > 0
        ? log.entityLabel
        : typeof details?.name === 'string'
        ? details.name
        : null;
    return name ? `Member ${name}` : log.entityId ? `Member #${log.entityId}` : 'Member';
  }

  if (log.entityLabel && log.entityId) {
    return `${log.entityLabel} (#${log.entityId})`;
  }

  return log.entityLabel ?? log.entity;
}

function renderDiffValues(
  title: string,
  values: Record<string, unknown>,
) {
  const entries = Object.entries(values);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {entries.map(([k, v]) => (
        <div key={`${title}-${k}`} className="flex gap-2 text-xs pl-2">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">
            {k.replace(/([A-Z])/g, ' $1').trim()}:
          </span>
          <span className="font-mono text-foreground break-all">{String(v ?? '-')}</span>
        </div>
      ))}
    </div>
  );
}

// ── Expandable metadata component ─────────────────────────────────────────

const MetadataView = memo(function MetadataView({ details }: { details?: Record<string, unknown> }) {
  if (!details || Object.keys(details).length === 0) {
    return <p className="text-xs text-muted-foreground italic">No metadata</p>;
  }

  const transactionId =
    typeof details.transactionId === 'string' && details.transactionId.length > 0
      ? details.transactionId
      : '-';
  const donorPhone =
    typeof details.donorPhone === 'string' && details.donorPhone.length > 0
      ? details.donorPhone
      : '-';
  const paymentType = formatPaymentType(details.paymentType);
  const verifiedCount = typeof details.verifiedCount === 'number' ? String(details.verifiedCount) : '-';
  const totalAmount = typeof details.totalAmount === 'number' ? formatCurrency(details.totalAmount) : '-';

  const before =
    details.before && typeof details.before === 'object'
      ? (details.before as Record<string, unknown>)
      : null;
  const after =
    details.after && typeof details.after === 'object'
      ? (details.after as Record<string, unknown>)
      : null;

  const SKIP = new Set([
    'before',
    'after',
    'transactionId',
    'donorPhone',
    'paymentType',
    'verifiedCount',
    'totalAmount',
  ]);

  return (
    <div className="space-y-3">
      <div className="grid gap-1 sm:grid-cols-2">
        <div className="flex gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">Transaction ID:</span>
          <span className="font-mono text-foreground break-all">{transactionId}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">Donor phone:</span>
          <span className="font-mono text-foreground break-all">{donorPhone}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">Payment type:</span>
          <span className="font-mono text-foreground break-all">{paymentType}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">Verified count:</span>
          <span className="font-mono text-foreground break-all">{verifiedCount}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-muted-foreground">Total amount:</span>
          <span className="font-mono text-foreground break-all">{totalAmount}</span>
        </div>
      </div>

      {Object.entries(details).map(([key, val]) => {
        if (SKIP.has(key)) return null;
        const display =
          val === null || val === undefined
            ? '-'
            : typeof val === 'object'
            ? JSON.stringify(val)
            : String(val);
        return (
          <div key={key} className="flex gap-2 text-xs">
            <span className="w-36 shrink-0 font-medium text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <span className="font-mono text-foreground break-all">{display}</span>
          </div>
        );
      })}
      {before && renderDiffValues('Before', before)}
      {after && renderDiffValues('After', after)}
    </div>
  );
});

// ── Main page component ────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const router = useRouter();
  const { canViewAuditLogs } = usePermission();

  useEffect(() => {
    if (!canViewAuditLogs) router.replace('/dashboard');
  }, [canViewAuditLogs, router]);

  if (!canViewAuditLogs) {
    return null;
  }

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fundFilter, setFundFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const fetchLockRef = useRef(false);
  const listCacheRef = useRef<{ key: string; at: number; data: AuditLog[]; totalPages: number } | null>(null);

  const activeFilters: AuditLogFilters = {
    page,
    limit: 20,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    fund: fundFilter !== 'all' ? fundFilter : undefined,
    dateRange:
      dateRange !== 'all'
        ? (dateRange as 'today' | 'week' | 'month' | 'custom')
        : undefined,
  };

  const fetchLogs = useCallback(async () => {
    if (fetchLockRef.current) return;
    const cacheKey = `${page}:${actionFilter}:${entityFilter}:${fundFilter}:${dateRange}:${debouncedSearch}`;
    const now = Date.now();
    const cache = listCacheRef.current;
    if (cache && cache.key === cacheKey && now - cache.at < 5000) {
      setLogs(cache.data);
      setTotalPages(cache.totalPages);
      return;
    }

    fetchLockRef.current = true;
    setIsLoading(true);
    try {
      const result = await auditService.getAll(activeFilters);
      // client-side user-name search (small additional filter)
      const filtered = debouncedSearch
        ? result.data.filter((l) =>
            (l.userName ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()),
          )
        : result.data;
      const bounded = filtered.length > 50 ? filtered.slice(0, 50) : filtered;
      setLogs(bounded);
      setTotalPages(result.totalPages);
      listCacheRef.current = {
        key: cacheKey,
        at: now,
        data: bounded,
        totalPages: result.totalPages,
      };
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load audit logs'));
      setLogs([]);
    } finally {
      setIsLoading(false);
      fetchLockRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, entityFilter, fundFilter, dateRange, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, fundFilter, dateRange, debouncedSearch]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function getExportRows(): Promise<AuditLog[]> {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    const exportFilters: AuditLogFilters = {
      ...activeFilters,
      page: undefined,
      limit: undefined,
    };

    const rows = await collectPaginatedExportRows<AuditLog>({
      maxRows: EXPORT_MAX_ROWS,
      chunkSize: 100,
      shouldInclude: (row) => {
        if (!normalizedSearch) return true;
        return (row.userName ?? '').toLowerCase().includes(normalizedSearch);
      },
      fetchPage: async (currentPage, limit) => {
        const response = await auditService.getAll({
          ...exportFilters,
          page: currentPage,
          limit,
        });

        return {
          data: response.data,
          page: response.page,
          totalPages: response.totalPages,
        };
      },
    });

    return rows;
  }

  async function handleExportCsv() {
    setIsExporting('csv');
    try {
      const rows = await getExportRows();

      await downloadCsvExport({
        filename: `audit-log-${Date.now()}.csv`,
        rows,
        columns: [
          { header: 'Date', value: (row) => formatDateTime(row.timestamp) },
          { header: 'User', value: (row) => row.userName ?? 'System' },
          { header: 'Action', value: (row) => row.action },
          { header: 'Entity', value: (row) => formatEntityLabel(row) },
          { header: 'Fund', value: (row) => readAuditFund(row.details) },
          { header: 'Amount', value: (row) => getAmountDisplay(row) },
        ],
      });

      if (rows.length >= EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export CSV'));
    } finally {
      setIsExporting(null);
    }
  }

  async function handleExportPdf() {
    setIsExporting('pdf');
    try {
      const rows = await getExportRows();

      await downloadPdfExport({
        filename: `audit-log-${Date.now()}.pdf`,
        title: 'Audit Logs Export',
        rows,
        columns: [
          { header: 'Date', value: (row) => formatDateTime(row.timestamp) },
          { header: 'User', value: (row) => row.userName ?? 'System' },
          { header: 'Action', value: (row) => row.action },
          { header: 'Entity', value: (row) => formatEntityLabel(row) },
          { header: 'Fund', value: (row) => readAuditFund(row.details) },
          { header: 'Amount', value: (row) => getAmountDisplay(row) },
        ],
      });

      if (rows.length >= EXPORT_MAX_ROWS) {
        toast.info(`Export capped at ${EXPORT_MAX_ROWS} rows`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export PDF'));
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Track all actions and changes in your mosque">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting !== null}
          >
            {isExporting === 'csv' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting !== null}
          >
            {isExporting === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-45 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setIsFiltersOpen(true)}>
          Filters
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="border-border">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3 py-2">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-4">
              <ListEmptyState
                title="No audit logs found"
                description="Try broadening filters to view activity history."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  setActionFilter('all');
                  setEntityFilter('all');
                  setFundFilter('all');
                  setDateRange('all');
                  setPage(1);
                }}
              />
            </div>
          ) : (
            <div className="ds-stack">
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const isExpanded = expandedRows.has(log.id);
                      const amountDisplay = getAmountDisplay(log);
                      const fund = readAuditFund(log.details);
                      const entityLabel = formatEntityLabel(log);
                      const badgeClass =
                        ACTION_BADGE_COLORS[log.action] ?? 'bg-gray-100 text-gray-800';
                      const hasMetadata =
                        log.details && Object.keys(log.details).length > 0;

                      return (
                        <Fragment key={log.id}>
                          <TableRow
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
                            onClick={() => hasMetadata && toggleRow(log.id)}
                          >
                            <TableCell className="pr-0">
                              {hasMetadata ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs whitespace-nowrap ${badgeClass}`}>
                                {toActionLabel(log.action)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {log.userName ?? 'System'}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {entityLabel}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{fund}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {amountDisplay}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.timestamp)}
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-muted/20">
                              <TableCell />
                              <TableCell colSpan={6} className="pb-4 pt-2">
                                <div className="rounded-xl border border-border bg-background p-3">
                                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Event Metadata
                                  </p>
                                  <MetadataView details={log.details} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const amountDisplay = getAmountDisplay(log);
                  const fund = readAuditFund(log.details);
                  const entityLabel = formatEntityLabel(log);
                  const badgeClass = ACTION_BADGE_COLORS[log.action] ?? 'bg-gray-100 text-gray-800';
                  const hasMetadata = log.details && Object.keys(log.details).length > 0;
                  const userLabel = log.userName ?? 'System';

                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border border-border p-4 ${isExpanded ? 'bg-muted/20' : 'bg-background'}`}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full p-0 text-left hover:bg-transparent"
                        onClick={() => hasMetadata && toggleRow(log.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">{userLabel}</p>
                            <p className="truncate text-xs text-muted-foreground">{entityLabel}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              <Badge className={`text-xs ${badgeClass}`}>{toActionLabel(log.action)}</Badge>
                              <p className="mt-1 text-xs text-muted-foreground">{amountDisplay}</p>
                            </div>
                            {hasMetadata ? (
                              isExpanded ? (
                                <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              )
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <p className="truncate">{formatDateTime(log.timestamp)}</p>
                          <p className="truncate">{fund}</p>
                        </div>
                      </Button>

                      {isExpanded && hasMetadata && (
                        <div className="mt-3 rounded-xl border border-border bg-background p-3">
                          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Event Metadata
                          </p>
                          <MetadataView details={log.details} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 ds-stack">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fundFilter} onValueChange={setFundFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Fund" />
              </SelectTrigger>
              <SelectContent>
                {FUND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDateRange('all');
                setActionFilter('all');
                setEntityFilter('all');
                setFundFilter('all');
                setIsFiltersOpen(false);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
