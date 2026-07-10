import MyPageSidebar from '../../../components/user/mypage/MyPageSidebar';
import '@/styles/user/mypage/MyPage.css';
import { BillingNoticeSection } from '../../../components/user/subscription/BillingNoticeSection';
import { CancelSubscriptionModal } from '../../../components/user/subscription/CancelSubscriptionModal';
import { PaymentHistorySection } from '../../../components/user/subscription/PaymentHistorySection';
import { SubscriptionHistorySection } from '../../../components/user/subscription/SubscriptionHistorySection';
import { usePaymentHistoryStatus } from '../../../hooks/user/subscription';
import { PAYMENT_HISTORY_PERIOD } from '../../../types/user/subscription';

function PaymentHistoryPage() {
  const {
    periodFilter,
    page,
    cancelTarget,
    cancelSuccess,
    successMessage,
    activeSubscriptions,
    payments,
    totalPages,
    noSubscriptions,
    singleRecommendation,
    isSubscriptionsLoading,
    isSubscriptionsError,
    isPaymentHistoryLoading,
    isPaymentHistoryError,
    isCanceling,
    setPeriodFilter,
    setPage,
    setCancelTarget,
    handleCancelConfirm,
    handleCancelClose,
  } = usePaymentHistoryStatus(PAYMENT_HISTORY_PERIOD.TWELVE_MONTHS);

  return (
    <>
      <div className="cw-mypage-layout">
        <MyPageSidebar />

        <section className="cw-dashboard-section cw-billing-page">
          <SubscriptionHistorySection
            successMessage={successMessage}
            isLoading={isSubscriptionsLoading}
            isError={isSubscriptionsError}
            noSubscriptions={noSubscriptions}
            activeSubscriptions={activeSubscriptions}
            singleRecommendation={singleRecommendation}
            isCanceling={isCanceling}
            onCancel={setCancelTarget}
          />
          <PaymentHistorySection
            periodFilter={periodFilter}
            page={page}
            totalPages={totalPages}
            isLoading={isPaymentHistoryLoading}
            isError={isPaymentHistoryError}
            payments={payments}
            onPeriodChange={setPeriodFilter}
            onPageChange={setPage}
          />
          <BillingNoticeSection />
        </section>
      </div>

      {cancelTarget && (
        <CancelSubscriptionModal
          productName={cancelTarget.name}
          isPending={isCanceling}
          isSuccess={cancelSuccess}
          onConfirm={handleCancelConfirm}
          onClose={handleCancelClose}
        />
      )}
    </>
  );
}

export default PaymentHistoryPage;
