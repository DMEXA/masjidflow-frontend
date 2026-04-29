import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function MuqtadiFilters({
  primaryFilter,
  setPrimaryFilter,
  search,
  setSearch,
  accountFilter,
  setAccountFilter,
  cycleFilter,
  setCycleFilter,
  paymentFilter,
  setPaymentFilter,
  sortOrder,
  setSortOrder,
  clearFilters,
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pendingAccountFilter, setPendingAccountFilter] = useState(accountFilter);
  const [pendingCycleFilter, setPendingCycleFilter] = useState(cycleFilter);
  const [pendingPaymentFilter, setPendingPaymentFilter] = useState(paymentFilter);
  const [pendingSortOrder, setPendingSortOrder] = useState(sortOrder);

  useEffect(() => {
    setPendingAccountFilter(accountFilter);
  }, [accountFilter]);

  useEffect(() => {
    setPendingCycleFilter(cycleFilter);
  }, [cycleFilter]);

  useEffect(() => {
    setPendingPaymentFilter(paymentFilter);
  }, [paymentFilter]);

  useEffect(() => {
    setPendingSortOrder(sortOrder);
  }, [sortOrder]);

  const primaryTabs = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Verified', value: 'verified' },
      { label: 'Pending', value: 'pending' },
      { label: 'Disabled', value: 'disabled' },
    ],
    [],
  );

  const hasActiveFilters =
    primaryFilter !== 'all'
    || accountFilter !== 'all'
    || cycleFilter !== 'all'
    || paymentFilter !== 'all'
    || sortOrder !== 'newest'
    || Boolean(search.trim());

  return (
    <>
      <div className="space-y-2">
        <div className="overflow-x-auto pb-0.5">
          <div className="grid min-w-85 grid-cols-4 gap-1">
            {primaryTabs.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant={primaryFilter === tab.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPrimaryFilter(tab.value)}
                className="h-8 w-full rounded-md px-2 text-[11px]"
              >
                <span className="truncate">{tab.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 flex-1 rounded-md"
          />
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-md" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md px-2 text-xs" onClick={clearFilters}>
              Clear
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
            <Select value={pendingAccountFilter} onValueChange={setPendingAccountFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="account">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pendingCycleFilter} onValueChange={setPendingCycleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycle States</SelectItem>
                <SelectItem value="included">Included</SelectItem>
                <SelectItem value="not_included">Not Included</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pendingPaymentFilter} onValueChange={setPendingPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment States</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="proof_pending">Proof Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pendingSortOrder} onValueChange={setPendingSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  clearFilters();
                  setIsFiltersOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  setAccountFilter(pendingAccountFilter);
                  setCycleFilter(pendingCycleFilter);
                  setPaymentFilter(pendingPaymentFilter);
                  setSortOrder(pendingSortOrder);
                  setIsFiltersOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
