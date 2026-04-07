import { ListEmptyState } from '@/components/common/list-empty-state';
import MuqtadiCard from '@/components/muqtadis/MuqtadiCard';

export default function MuqtadiList({
  isLoading,
  items,
  accountFilter,
  onAdd,
  resolvePaymentStatus,
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
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border-0 p-0">
        <ListEmptyState
          title={accountFilter === 'offline' ? 'No offline households remaining' : 'No households found'}
          description={
            accountFilter === 'offline'
              ? 'All households are already linked to accounts.'
              : 'Add your first household to start tracking dues and payments.'
          }
          actionLabel={accountFilter === 'offline' ? undefined : 'Add Household'}
          onAction={accountFilter === 'offline' ? undefined : onAdd}
        />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      {items.map((item) => (
        <MuqtadiCard
          key={item.id}
          item={item}
          paymentStatus={resolvePaymentStatus(item)}
          formatDate={formatDate}
          openEdit={openEdit}
          openPayment={openPayment}
          openCreateAccount={openCreateAccount}
          toggleStatus={toggleStatus}
          actionLoadingId={actionLoadingId}
          createAccountLoadingId={createAccountLoadingId}
          submitting={submitting}
          pendingVerificationId={pendingVerificationId}
          handleVerifyMuqtadi={handleVerifyMuqtadi}
          handleRejectMuqtadi={handleRejectMuqtadi}
        />
      ))}
    </div>
  );
}
