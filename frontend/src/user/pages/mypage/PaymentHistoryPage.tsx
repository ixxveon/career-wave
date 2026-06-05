import { Link } from 'react-router-dom';
import './MyPage.css';
import { BillingNoticeSection } from '../../components/subscription/BillingNoticeSection';
import { CancelSubscriptionModal } from '../../components/subscription/CancelSubscriptionModal';
import { PaymentHistorySection } from '../../components/subscription/PaymentHistorySection';
import { SubscriptionHistorySection } from '../../components/subscription/SubscriptionHistorySection';
import { usePaymentHistoryStatus } from '../../hooks/subscription';
import { PAYMENT_HISTORY_PERIOD } from '../../types/subscription';

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
  } = usePaymentHistoryStatus(PAYMENT_HISTORY_PERIOD.SIX_MONTHS);

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
