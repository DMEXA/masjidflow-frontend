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
}) {
  return (
    <div
      className={`ds-stack rounded-xl border p-4 ${
        item.userId ? 'bg-white border-border' : 'bg-gray-50 border-gray-200'
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
            <p className="text-base font-semibold text-foreground truncate">{item.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`whitespace-nowrap ${
            item.userId ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {item.userId ? 'Account' : 'Offline'}
          </Badge>
          <Badge variant={item.isDisabled ? 'secondary' : 'default'} className="whitespace-nowrap">
            {item.isDisabled ? 'Disabled' : 'Active'}
          </Badge>
          <Badge className={`whitespace-nowrap ${
            paymentStatus === 'PAID'
              ? 'bg-green-100 text-green-700'
              : paymentStatus === 'PARTIAL'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {paymentStatus}
          </Badge>
          <Badge className={`whitespace-nowrap ${
            item.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {item.isVerified ? 'Verified' : 'Pending'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>{item.householdMembers || 0} members</p>
        <p>{formatDate(item.createdAt)}</p>
      </div>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
        {!item.isVerified ? (
          <div className="hidden items-center gap-2 md:flex">
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
          <div className="flex items-center gap-1 text-xs text-green-700">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Active</span>
          </div>
        )}

        <ActionOverflowMenu
          items={[
            { label: 'Edit', onSelect: () => openEdit(item) },
            { label: 'Record Payment', onSelect: () => openPayment(item) },
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
