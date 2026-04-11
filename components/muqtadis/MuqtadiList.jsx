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
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/60 p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-9 w-full rounded bg-muted" />
            </div>
          </div>
        ))}
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
    <div className="space-y-3">
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
