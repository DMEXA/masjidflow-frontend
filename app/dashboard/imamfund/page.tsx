'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Receipt, SlidersHorizontal, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { StatCard } from '@/components/dashboard/stat-card';
import { useAuthStore } from '@/src/store/auth.store';
import { formatCurrency, formatCycleLabel, formatDate } from '@/src/utils/format';
import { muqtadisService, type ImamFundLedgerTransactionType } from '@/services/muqtadis.service';
import { queryKeys } from '@/lib/query-keys';

const PAGE_LIMIT = 20;

const TRANSACTION_TYPE_LABELS: Record<ImamFundLedgerTransactionType, string> = {
  COLLECTION: 'Collection',
  PAYOUT: 'Payout',
  ADJUSTMENT: 'Adjustment',
};

function toMonthCode(year: number, month: number): string {
  const paddedMonth = String(month).padStart(2, '0');
  return `${year}-${paddedMonth}`;
}

function getTypeBadgeClass(type: ImamFundLedgerTransactionType): string {
  if (type === 'COLLECTION') return 'bg-emerald-100 text-emerald-900';
  if (type === 'PAYOUT') return 'bg-rose-100 text-rose-900';
  return 'bg-amber-100 text-amber-900';
}

function getStatusBadgeClass(status: string): string {
  return status.toUpperCase() === 'VERIFIED'
    ? 'bg-emerald-100 text-emerald-900'
    : 'bg-slate-100 text-slate-800';
}

export default function ImamFundPage() {
  const { mosque, token } = useAuthStore();
  const mosqueId = mosque?.id;

  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ImamFundLedgerTransactionType>('all');
  const [pendingMonthFilter, setPendingMonthFilter] = useState('all');
  const [pendingTypeFilter, setPendingTypeFilter] = useState<'all' | ImamFundLedgerTransactionType>('all');

  const historyQuery = useQuery({
    queryKey: queryKeys.imamFundHistory(mosqueId, {
      page,
      limit: PAGE_LIMIT,
      month: monthFilter,
      type: typeFilter,
    }),
    queryFn: () =>
      muqtadisService.getImamFundHistory({
        page,
        limit: PAGE_LIMIT,
        month: monthFilter !== 'all' ? monthFilter : undefined,
        type: typeFilter,
      }),
    enabled: Boolean(mosqueId) && Boolean(token),
  });

  const summary = historyQuery.data?.summary ?? {
    totalCollected: 0,
    totalPaidOut: 0,
    currentBalance: 0,
  };

  const monthlyRows = useMemo(() => historyQuery.data?.monthly ?? [], [historyQuery.data?.monthly]);
  const transactions = useMemo(() => historyQuery.data?.transactions ?? [], [historyQuery.data?.transactions]);

  const monthOptions = useMemo(() => {
    const codes = monthlyRows
      .slice()
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .map((row) => toMonthCode(row.year, row.month));

    return Array.from(new Set(codes));
  }, [monthlyRows]);

  const canGoPrevious = Boolean(historyQuery.data?.hasPreviousPage);
  const canGoNext = Boolean(historyQuery.data?.hasNextPage);

  return (
    <div className="ds-section ds-stack">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Imam Fund</h1>
        <p className="text-sm text-muted-foreground">Monthly collections, salary payouts, balance history, and ledger visibility.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Collected"
          value={historyQuery.isLoading ? 'Loading...' : formatCurrency(summary.totalCollected, '₹')}
          description="Verified Muqtadi collections"
          icon={Wallet}
          tone="green"
        />
        <StatCard
          title="Total Paid Out"
          value={historyQuery.isLoading ? 'Loading...' : formatCurrency(summary.totalPaidOut, '₹')}
          description="Salary and fund outflows"
          icon={Receipt}
          tone="red"
        />
        <StatCard
          title="Current Balance"
          value={historyQuery.isLoading ? 'Loading...' : formatCurrency(summary.currentBalance, '₹')}
          description="Running Imam Fund balance"
          icon={CircleDollarSign}
          tone="blue"
        />
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Monthly Scroll</CardTitle>
          <CardDescription>Swipe horizontally for month-wise collection, payout, and net movement.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="min-w-48 shrink-0 rounded-xl border border-border p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-3 w-32" />
                  <Skeleton className="mt-2 h-3 w-32" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>
          ) : monthlyRows.length === 0 ? (
            <ListEmptyState
              title="No monthly history yet"
              description="Transactions will appear here after collections or payouts are posted."
              className="min-h-32"
            />
          ) : (
            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
              {monthlyRows
                .slice()
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  return b.month - a.month;
                })
                .map((row) => {
                  const net = Number((row.collected - row.paidOut).toFixed(2));
                  return (
                    <div key={`${row.year}-${row.month}`} className="min-w-52 shrink-0 rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">{formatCycleLabel(row.month, row.year)}</p>
                      <p className="mt-2 text-xs text-emerald-600">Collected: {formatCurrency(row.collected, '₹')}</p>
                      <p className="mt-1 text-xs text-rose-600">Paid Out: {formatCurrency(row.paidOut, '₹')}</p>
                      <p className={`mt-1 text-xs font-medium ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        Net: {formatCurrency(net, '₹')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Balance: {formatCurrency(row.balance, '₹')}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Ledger</h2>
            <p className="text-sm text-muted-foreground">Detailed Imam Fund transaction history</p>
          </div>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {historyQuery.isLoading ? (
          <Card className="border">
            <CardContent className="py-6">
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            </CardContent>
          </Card>
        ) : historyQuery.error ? (
          <Card className="border">
            <CardContent className="py-6">
              <ListEmptyState
                title="Unable to load ledger"
                description="Please retry loading Imam Fund history."
                actionLabel="Retry"
                onAction={() => historyQuery.refetch()}
                className="min-h-32"
              />
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="border">
            <CardContent className="py-6">
              <ListEmptyState
                title="No ledger entries"
                description="Try changing filters or wait for the next collection/payout entry."
                actionLabel="Clear Filters"
                onAction={() => {
                  setMonthFilter('all');
                  setTypeFilter('all');
                  setPendingMonthFilter('all');
                  setPendingTypeFilter('all');
                  setPage(1);
                }}
                className="min-h-32"
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {transactions.map((entry) => (
                <Card key={entry.id} className="border">
                  <CardContent className="space-y-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={getTypeBadgeClass(entry.type)}>{TRANSACTION_TYPE_LABELS[entry.type]}</Badge>
                      <p className={`text-sm font-semibold ${entry.type === 'PAYOUT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {entry.type === 'PAYOUT' ? '-' : '+'}
                        {formatCurrency(entry.amount, '₹')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <p>{formatCycleLabel(entry.month, entry.year)}</p>
                      <Badge className={getStatusBadgeClass(entry.status)}>{entry.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</p>
                    <p className="text-xs text-muted-foreground">{entry.note || '-'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="hidden border md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((entry) => (
                        <tr key={entry.id} className="border-b align-top">
                          <td className="px-4 py-3">
                            <Badge className={getTypeBadgeClass(entry.type)}>{TRANSACTION_TYPE_LABELS[entry.type]}</Badge>
                          </td>
                          <td className={`px-4 py-3 font-medium ${entry.type === 'PAYOUT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {entry.type === 'PAYOUT' ? '-' : '+'}{formatCurrency(entry.amount, '₹')}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusBadgeClass(entry.status)}>{entry.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatCycleLabel(entry.month, entry.year)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.createdAt, 'MMM dd, yyyy hh:mm a')}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {(historyQuery.data?.total ?? 0) > PAGE_LIMIT ? (
          <div className="flex flex-row items-center justify-between gap-2 rounded-xl border p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-auto"
              disabled={!canGoPrevious}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <p className="text-center text-sm text-muted-foreground">Page {historyQuery.data?.page ?? page}</p>
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
      </div>

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 ds-stack">
            <Select value={pendingMonthFilter} onValueChange={setPendingMonthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthOptions.map((value) => {
                  const [yearText, monthText] = value.split('-');
                  const year = Number(yearText);
                  const month = Number(monthText);
                  return (
                    <SelectItem key={value} value={value}>
                      {formatCycleLabel(month, year)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={pendingTypeFilter} onValueChange={(value) => setPendingTypeFilter(value as 'all' | ImamFundLedgerTransactionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="COLLECTION">Collection</SelectItem>
                <SelectItem value="PAYOUT">Payout</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="w-full"
              onClick={() => {
                setMonthFilter(pendingMonthFilter);
                setTypeFilter(pendingTypeFilter);
                setPage(1);
                setIsFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
