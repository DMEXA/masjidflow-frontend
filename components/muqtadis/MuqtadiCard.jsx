import { memo, useMemo } from 'react';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';

function MuqtadiCard({
  item,
  paymentStatus,
  formatDate,
  toggleStatus,
  actionLoadingId,
  pendingVerificationId,
  handleVerifyMuqtadi,
  handleRejectMuqtadi,
  openPayment,
  openPaymentDetails,
}) {
  const isDeleted = Boolean(item.isDeleted || item.isDisabled || item.status === 'DISABLED');
  const isDisabled = Boolean(item.isDisabled || item.status === 'DISABLED');

  const parseBooleanValue = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
    }
    return false;
  };

  const proofPendingRaw =
    item.proofPending
    ?? item.isProofPending
    ?? item.paymentProofPending
    ?? item.paymentVerificationStatus;
  const isProofPending =
    parseBooleanValue(proofPendingRaw)
    || String(item.paymentVerificationStatus || '').trim().toUpperCase() === 'PENDING';
  const isVerificationPending = item.isVerified === false;
  const requiresPayment = paymentStatus === 'UNPAID' || isVerificationPending;
  const hasPendingOrProof = isVerificationPending || isProofPending;
  const remainingAmount = Math.max(Number(item.remainingAmount ?? 0), 0);
  const creditAmount = Math.max(Number(item.creditAmount ?? 0), 0);
  const hasDueSummary = Number.isFinite(Number(item.remainingAmount));

  const statusPriority = {
    UNPAID: 0,
    PENDING: 1,
    PENDING_PROOF: 2,
  };

  const statusItems = [
    paymentStatus === 'UNPAID' ? 'UNPAID' : null,
    isVerificationPending ? 'PENDING' : null,
    isProofPending ? 'PENDING_PROOF' : null,
  ]
    .filter(Boolean)
    .sort((left, right) => statusPriority[left] - statusPriority[right])
    .slice(0, 2);

  const statusClassMap = {
    UNPAID: 'border-red-200 bg-red-100 text-red-700',
    PENDING: 'border-yellow-200 bg-yellow-100 text-yellow-800',
    PENDING_PROOF: 'border-orange-200 bg-orange-100 text-orange-800',
  };

  const accountState = item.accountState || 'OFFLINE';
  const accountLabel = accountState === 'ACTIVE' ? 'Online' : accountState === 'PENDING_SETUP' ? 'Pending Setup' : 'Offline';
  const accountDotClass =
    accountState === 'ACTIVE'
      ? 'bg-emerald-500'
      : accountState === 'PENDING_SETUP'
        ? 'bg-amber-500'
        : 'bg-slate-400';
  const joinedLabel = formatDate(item.createdAt);
  const contactLabel = item.phone || item.whatsappNumber || item.email || '-';

  const menuItems = useMemo(
    () => [
      requiresPayment
        ? {
            label: 'Make Payment',
            onSelect: () => openPayment(item),
            disabled: isDeleted,
          }
        : null,
      hasPendingOrProof
        ? {
            label: pendingVerificationId === item.id ? 'Verifying...' : 'Verify',
            onSelect: () => handleVerifyMuqtadi(item),
            disabled: pendingVerificationId === item.id || Boolean(pendingVerificationId),
          }
        : null,
      hasPendingOrProof
        ? {
            label: pendingVerificationId === item.id ? 'Rejecting...' : 'Reject',
            onSelect: () => handleRejectMuqtadi(item),
            disabled: pendingVerificationId === item.id || Boolean(pendingVerificationId),
          }
        : null,
      {
        label: actionLoadingId === item.id ? 'Deleting...' : 'Delete',
        onSelect: () => toggleStatus(item, 'DISABLED'),
        destructive: true,
        separatorBefore: true,
        disabled: isDisabled,
      },
    ].filter(Boolean),
    [
      actionLoadingId,
      handleRejectMuqtadi,
      handleVerifyMuqtadi,
      hasPendingOrProof,
      isDeleted,
      isDisabled,
      item,
      openPayment,
      pendingVerificationId,
      requiresPayment,
      toggleStatus,
    ],
  );

  return (
    <div
      className={`space-y-1.5 rounded-lg border px-3 py-2.5 shadow-sm ${
        isDisabled ? 'opacity-80' : ''
      } cursor-pointer`}
      data-row-kind="muqtadi"
      data-row-id={item.id}
      role="button"
      tabIndex={0}
      onClick={() => openPaymentDetails(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPaymentDetails(item);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
          </div>
        </div>
        <ActionOverflowMenu items={menuItems} />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{item.householdMembers || 0} members</p>
        <Badge variant={isDisabled ? 'secondary' : 'default'} className="whitespace-nowrap">
          {isDisabled ? 'Disabled' : 'Active'}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="truncate">{joinedLabel} • {contactLabel}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusItems.map((status) => (
            <Badge key={`${item.id}-${status}`} className={`whitespace-nowrap ${statusClassMap[status]}`}>
              {status}
            </Badge>
          ))}
          {hasDueSummary ? (
            <Badge variant={remainingAmount > 0 ? 'secondary' : 'default'}>
              {remainingAmount > 0 ? `₹${remainingAmount.toFixed(2)} pending` : 'Paid'}
            </Badge>
          ) : null}
          {creditAmount > 0 ? (
            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
              {`Credit ₹${creditAmount.toFixed(2)}`}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${accountDotClass}`} />
          <span className="whitespace-nowrap">{accountLabel}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(MuqtadiCard);
