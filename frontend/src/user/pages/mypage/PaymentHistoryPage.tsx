import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import './MyPage.css';
import { CancelSubscriptionModal } from '../../components/subscription/CancelSubscriptionModal';
import { PaymentHistoryList } from '../../components/subscription/PaymentHistoryList';
import { PaymentHistorySubscriptionCard } from '../../components/subscription/PaymentHistorySubscriptionCard';
import { RecommendationCard } from '../../components/subscription/RecommendationCard';
import { usePaymentHistoryStatus } from '../../hooks/subscription';
import { PAYMENT_HISTORY_PERIOD, type PaymentHistoryPeriod } from '../../types/subscription';
import { BILLING_NOTICE_ITEMS, PAYMENT_HISTORY_PERIOD_OPTIONS } from '../../utils/subscription/subscriptionContent';

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
          <section className="cw-subscription-section cw-billing-section">
            <div className="cw-subscription-section__head">
              <div>
                <h3>내 구독 내역</h3>
                <p>
                  현재 이용중인 상품과 자동 결제 상태를 실무적으로 확인할 수
                  있도록 정리했어요.
                </p>
              </div>
            </div>

            {successMessage && (
              <div className="cw-billing-success-toast">{successMessage}</div>
            )}

            {isSubscriptionsLoading ? (
              <div className="cw-billing-empty-state">
                <div>
                  <strong>구독 정보를 불러오는 중이에요.</strong>
                  <p>현재 구독 상태와 자동 결제 정보를 잠시만 기다려주세요.</p>
                </div>
              </div>
            ) : isSubscriptionsError ? (
              <div className="cw-billing-empty-state">
                <div>
                  <strong>구독 정보를 불러오지 못했어요.</strong>
                  <p>잠시 후 다시 시도해주세요.</p>
                </div>
              </div>
            ) : noSubscriptions ? (
              <div className="cw-billing-empty-state">
                <div
                  className="cw-billing-empty-state__icon"
                  aria-hidden="true"
                >
                  <Sparkles size={28} />
                </div>
                <div>
                  <strong>이용중인 구독 상품이 없어요.</strong>
                  <p>
                    필요한 AI 서비스를 살펴보고 지금 내게 맞는 상품을 비교해보세요.
                  </p>
                </div>
                <div className="cw-billing-empty-state__actions">
                  <Link to="/mypage/subscription">알아보기</Link>
                </div>
              </div>
            ) : activeSubscriptions.length === 1 && singleRecommendation ? (
              <div className="cw-billing-subscription-layout is-single">
                <PaymentHistorySubscriptionCard
                  subscription={activeSubscriptions[0]}
                  isCanceling={isCanceling}
                  onCancel={setCancelTarget}
                />
                <RecommendationCard item={singleRecommendation} />
              </div>
            ) : (
              <div className="cw-billing-subscription-layout">
                {activeSubscriptions.map((subscription) => (
                  <PaymentHistorySubscriptionCard
                    key={subscription.subscriptionId}
                    subscription={subscription}
                    isCanceling={isCanceling}
                    onCancel={setCancelTarget}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="cw-subscription-section cw-billing-section">
            <div className="cw-subscription-section__head">
              <div>
                <h3>최근 결제 내역</h3>
                <p>기간별 결제 이력을 간단하게 확인할 수 있어요.</p>
              </div>
            </div>

            <div className="cw-billing-filters">
              <label>
                <span>기간 선택</span>
                <select
                  value={periodFilter}
                  onChange={(event) => {
                    setPeriodFilter(event.target.value as PaymentHistoryPeriod);
                    setPage(1);
                  }}
                >
                  {PAYMENT_HISTORY_PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isPaymentHistoryLoading ? (
              <div className="cw-billing-payment-empty">
                <div className="cw-billing-payment-empty__icon" aria-hidden="true">
                  <Sparkles size={24} />
                </div>
                <strong>결제 내역을 불러오는 중이에요.</strong>
                <p>최근 결제 이력을 정리해서 보여드릴게요.</p>
              </div>
            ) : isPaymentHistoryError ? (
              <div className="cw-billing-payment-empty">
                <div className="cw-billing-payment-empty__icon" aria-hidden="true">
                  <Sparkles size={24} />
                </div>
                <strong>결제 내역을 불러오지 못했어요.</strong>
                <p>잠시 후 다시 시도해주세요.</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="cw-billing-payment-empty">
                <div className="cw-billing-payment-empty__icon" aria-hidden="true">
                  <Sparkles size={24} />
                </div>
                <strong>아직 최근 결제 내역이 없어요.</strong>
                <p>
                  첫 구독 또는 무료 체험을 시작하면 최근 결제 내역이 이곳에
                  차곡차곡 쌓여요.
                </p>
              </div>
            ) : (
              <PaymentHistoryList payments={payments} />
            )}

            {totalPages > 1 && (
              <div className="cw-billing-pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((pageValue) => Math.max(1, pageValue - 1))}
                >
                  <ChevronLeft size={16} />
                  이전
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((pageValue) => Math.min(totalPages, pageValue + 1))
                  }
                >
                  다음
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>

          <section className="cw-subscription-notice-card cw-billing-notice">
            <div className="cw-subscription-notice-card__title">
              <span>
                <Info size={18} />
              </span>
              <h4>결제내역 유의사항</h4>
            </div>
            <ul>
              {BILLING_NOTICE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
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
