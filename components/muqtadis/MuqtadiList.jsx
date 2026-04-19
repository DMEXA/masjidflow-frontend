import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import { ListEmptyState } from '@/components/common/list-empty-state';
import MuqtadiCard from '@/components/muqtadis/MuqtadiCard';
import { ListSkeleton } from '@/components/common/loading-skeletons';

const ROW_HEIGHT = 156;
const DEFAULT_CONTAINER_HEIGHT = 560;
const MIN_CONTAINER_HEIGHT = 320;
const MAX_CONTAINER_HEIGHT = 900;

const Row = memo(({ index, style, data }) => {
  const item = data.items[index];

  return (
    <div style={style}>
      <div className="pb-3">
        <MuqtadiCard
          item={item}
          paymentStatus={data.resolvePaymentStatus(item)}
          formatDate={data.formatDate}
          openEdit={data.openEdit}
          openPayment={data.openPayment}
          openCreateAccount={data.openCreateAccount}
          toggleStatus={data.toggleStatus}
          actionLoadingId={data.actionLoadingId}
          createAccountLoadingId={data.createAccountLoadingId}
          submitting={data.submitting}
          pendingVerificationId={data.pendingVerificationId}
          handleVerifyMuqtadi={data.handleVerifyMuqtadi}
          handleRejectMuqtadi={data.handleRejectMuqtadi}
          openPaymentDetails={data.openPaymentDetails}
        />
      </div>
    </div>
  );
});

Row.displayName = 'MuqtadiVirtualRow';

function MuqtadiList({
  isLoading,
  items,
  page,
  search,
  accountFilter,
  verificationFilter,
  cycleFilter,
  paymentFilter,
  sortOrder,
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
  const [containerHeight, setContainerHeight] = useState(DEFAULT_CONTAINER_HEIGHT);
  const listRef = useRef(null);

  useEffect(() => {
    const updateHeight = () => {
      const nextHeight = Math.max(
        MIN_CONTAINER_HEIGHT,
        Math.min(MAX_CONTAINER_HEIGHT, Math.floor(window.innerHeight * 0.7)),
      );
      setContainerHeight(nextHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, [page, search, accountFilter, verificationFilter, cycleFilter, paymentFilter, sortOrder]);

  const rowData = useMemo(
    () => ({
      items,
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
    }),
    [
      items,
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
    ],
  );

  const listHeight = Math.min(containerHeight, Math.max(ROW_HEIGHT, items.length * ROW_HEIGHT));

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

  if (items.length < 15) {
    return (
      <div className="space-y-3" data-list-kind="muqtadis" data-virtualization-ready="false">
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

  return (
    <div data-list-kind="muqtadis" data-virtualization-ready="true">
      <VirtualList
        ref={listRef}
        height={listHeight}
        itemCount={items.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        itemData={rowData}
        itemKey={(index, data) => data.items[index]?.id ?? `muqtadi-row-${index}`}
        overscanCount={4}
      >
        {Row}
      </VirtualList>
    </div>
  );
}

export default memo(MuqtadiList);
