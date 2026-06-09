import { Link } from 'react-router-dom';
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
  } = usePaymentHistoryStatus(PAYMENT_HISTORY_PERIOD.TWELVE_MONTHS);

  return (
    <>
      <div className="cw-mypage-layout">
        <aside className="cw-mypage-sidebar">
          <strong>마이페이지</strong>
          <nav>
            <Link to="/mypage">내 정보 관리</Link>
            <Link to="/mypage/favorites">스크랩 공고</Link>
            <Link to="/mypage/subscription">AI 서비스</Link>
            <Link to="/mypage/payment-history" className="is-active">
              구독/결제 내역
            </Link>
          </nav>
        </aside>

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
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
}

export default PaymentHistoryPage;
