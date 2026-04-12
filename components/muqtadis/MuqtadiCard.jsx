import Link from 'next/link';
import { Eye, Loader2, UserCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';

export default function MuqtadiCard({
  item,
  paymentStatus,
  formatDate,
  openEdit,
  openPayment,
  openCreateAccount,
  toggleStatus,
  actionLoadingId,
  createAccountLoadingId,
  submitting,
  pendingVerificationId,
  handleVerifyMuqtadi,
  handleRejectMuqtadi,
  openPaymentDetails,
}) {
  const isDeleted = Boolean(item.isDeleted || item.isDisabled || item.status === 'DISABLED');

  return (
    <div
      className={`space-y-3 rounded-xl border p-4 shadow-sm ${
        item.userId ? 'border-border bg-background' : 'border-amber-200 bg-amber-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.userId ? (
              <UserCheck className="h-4 w-4 text-green-700" />
            ) : (
              <User className="h-4 w-4 text-gray-500" />
            )}
            <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.householdMembers || 0} members</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Badge className={`whitespace-nowrap ${
            item.userId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {item.userId ? 'Account' : 'Offline'}
          </Badge>
          <Badge variant={item.isDisabled ? 'secondary' : 'default'} className="whitespace-nowrap">
            {item.isDisabled ? 'Disabled' : 'Active'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className={`h-6 px-2 text-[10px] ${
              paymentStatus === 'PAID'
                ? 'border-green-200 bg-green-100 text-green-700 hover:bg-green-100'
                : paymentStatus === 'PARTIAL'
                  ? 'border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                  : 'border-red-200 bg-red-100 text-red-700 hover:bg-red-100'
            }`}
            onClick={() => openPaymentDetails(item)}
          >
            {paymentStatus}
          </Button>
          <Badge className={`whitespace-nowrap ${
            item.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {item.isVerified ? 'Verified' : 'Pending'}
          </Badge>
          {item.proofPending ? (
            <Badge className="whitespace-nowrap bg-amber-100 text-amber-800">Proof Pending</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <p>Joined {formatDate(item.createdAt)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!item.isVerified ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerifyMuqtadi(item)}
              disabled={pendingVerificationId === item.id || Boolean(pendingVerificationId)}
            >
              {pendingVerificationId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRejectMuqtadi(item)}
              disabled={pendingVerificationId === item.id || Boolean(pendingVerificationId)}
            >
              {pendingVerificationId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject
            </Button>
          </div>
        ) : null}

        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/muqtadis/${item.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>

        <Button size="sm" variant="outline" onClick={() => openPaymentDetails(item)}>
          View Payment
        </Button>

        {!item.userId ? (
          <Button
            size="sm"
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openCreateAccount(item)}
            disabled={createAccountLoadingId === item.id || submitting}
          >
            {createAccountLoadingId === item.id ? 'Creating...' : 'Create Account'}
          </Button>
        ) : (
          <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-green-700">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Active</span>
          </div>
        )}

        <ActionOverflowMenu
          items={[
            { label: 'Edit', onSelect: () => openEdit(item) },
            {
              label: 'Record Payment',
              onSelect: () => openPayment(item),
              disabled: isDeleted,
            },
            item.isDisabled
              ? {
                  label: actionLoadingId === item.id ? 'Enabling...' : 'Enable',
                  onSelect: () => toggleStatus(item, 'ACTIVE'),
                }
              : {
                  label: actionLoadingId === item.id ? 'Disabling...' : 'Disable',
                  onSelect: () => toggleStatus(item, 'DISABLED'),
                },
          ]}
        />
      </div>
    </div>
  );
}
