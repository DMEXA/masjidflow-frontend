import { ListEmptyState } from '@/components/common/list-empty-state';
import MuqtadiCard from '@/components/muqtadis/MuqtadiCard';
import { ListSkeleton } from '@/components/common/loading-skeletons';

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
  openPaymentDetails,
}) {
  if (isLoading) {
    return <ListSkeleton count={4} className="h-20 w-full" />;
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
          openPaymentDetails={openPaymentDetails}
        />
      ))}
    </div>
  );
}
