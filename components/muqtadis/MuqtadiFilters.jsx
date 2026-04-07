import { Button } from '@/components/ui/button';

export default function MuqtadiFilters({
  accountFilter,
  setAccountFilter,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={accountFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setAccountFilter('all')}
        >
          All
        </Button>
        <Button
          type="button"
          size="sm"
          variant={accountFilter === 'account' ? 'default' : 'outline'}
          onClick={() => setAccountFilter('account')}
        >
          Account
        </Button>
        <Button
          type="button"
          size="sm"
          variant={accountFilter === 'offline' ? 'default' : 'outline'}
          onClick={() => setAccountFilter('offline')}
        >
          Offline
        </Button>
      </div>

      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: 'ALL', type: 'status', value: 'ALL' },
            { label: 'VERIFIED', type: 'status', value: 'VERIFIED' },
            { label: 'PENDING', type: 'status', value: 'PENDING' },
            { label: 'PAID', type: 'payment', value: 'PAID' },
            { label: 'PARTIAL', type: 'payment', value: 'PARTIAL' },
            { label: 'UNPAID', type: 'payment', value: 'UNPAID' },
          ].map((chip) => {
            const active =
              chip.type === 'status' ? statusFilter === chip.value : paymentFilter === chip.value;
            return (
              <Button
                key={`${chip.type}-${chip.value}`}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="whitespace-nowrap"
                onClick={() => {
                  if (chip.label === 'ALL') {
                    setStatusFilter('ALL');
                    setPaymentFilter('ALL');
                    return;
                  }
                  if (chip.type === 'status') {
                    setStatusFilter(chip.value);
                  } else {
                    setPaymentFilter(chip.value);
                  }
                }}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        <Button
          type="button"
          size="sm"
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('ALL')}
        >
          All Status
        </Button>
        <Button
          type="button"
          size="sm"
          variant={statusFilter === 'VERIFIED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('VERIFIED')}
        >
          Verified
        </Button>
        <Button
          type="button"
          size="sm"
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentFilter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setPaymentFilter('ALL')}
        >
          All Payments
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentFilter === 'PAID' ? 'default' : 'outline'}
          onClick={() => setPaymentFilter('PAID')}
        >
          Paid
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentFilter === 'PARTIAL' ? 'default' : 'outline'}
          onClick={() => setPaymentFilter('PARTIAL')}
        >
          Partial
        </Button>
        <Button
          type="button"
          size="sm"
          variant={paymentFilter === 'UNPAID' ? 'default' : 'outline'}
          onClick={() => setPaymentFilter('UNPAID')}
        >
          Unpaid
        </Button>
      </div>
    </div>
  );
}
