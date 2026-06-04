import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import './MyPage.css';
import { RecommendationCard } from '../../components/subscription/RecommendationCard';
import {
  useCancelSubscription,
  useMySubscriptions,
  usePaymentHistory,
  useProducts,
} from '../../hooks/subscription';
import {
  PAYMENT_HISTORY_PERIOD,
  SUBSCRIPTION_STATUS,
  type PaymentHistoryPeriod,
  type ProductCode,
  type UsageItem,
} from '../../types/subscription';
import {
  ALL_PRODUCT_CODES,
  PRODUCT_ACCENT,
  PRODUCT_TITLE,
  formatBillingDate,
} from '../../utils/subscription/subscriptionView';

type SubscriptionCardItem = {
  subscriptionId: string;
  productCode: ProductCode;
  name: string;
  cancelScheduled: boolean;
  nextBillingDate: string | null;
  billingCycle: string;
  monthlyPrice: string;
  startedAt: string;
  currentPeriodEnd: string;
};

type SubscriptionCardProps = {
  subscription: SubscriptionCardItem;
  isCanceling: boolean;
  onCancel: (subscription: SubscriptionCardItem) => void;
};

const PERIOD_OPTIONS: Array<{ label: string; value: PaymentHistoryPeriod }> = [
  { label: '최근 1개월', value: PAYMENT_HISTORY_PERIOD.ONE_MONTH },
  { label: '최근 3개월', value: PAYMENT_HISTORY_PERIOD.THREE_MONTHS },
  { label: '최근 6개월', value: PAYMENT_HISTORY_PERIOD.SIX_MONTHS },
  { label: '최근 1년', value: PAYMENT_HISTORY_PERIOD.TWELVE_MONTHS },
];

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
]);

const PAGE_SIZE = 5;
const CANCEL_REASON = 'NO_LONGER_NEEDED';

const noticeItems = [
  '결제 관련 사항(결제일시, 결제 수단, 취소, 미납 여부 등)은 관련 법령에 따라 보관되며, 결제일로부터 최대 5년간 조회 가능합니다.',
  '마일리지 등 적립받은 지급 수단으로 전액 결제하는 경우 현금영수증은 발급되지 않습니다.',
  '결제 취소 및 환불 요청 시 아래 기준이 적용됩니다.',
  '상품 이용기간 동안 해당 상품 전부를 이용하지 않은 경우에만 결제 취소 또는 환불이 가능할 수 있습니다.',
  '상품 이용기간은 상품 상세 페이지 및 유의사항 등에서 안내한 상품 이용 가능 기간을 의미합니다.',
  '구매한 상품의 일부라도 열람, 다운로드, 응시, 접속 등의 방법으로 확인했거나 이용 가능한 상태로 변경된 경우 상품 이용이 시작된 것으로 봅니다.',
  '상품 이용이 시작되면 결제 취소 및 환불 여부는 상품 특성 및 안내사항에 따라 제한될 수 있습니다.',
  '결제 및 취소/환불 관련 상세 문의는 고객센터를 통해 접수할 수 있습니다.',
];

function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₩${Number(amount).toLocaleString('ko-KR')}`;
}

function buildRecommendationItem(productCode: ProductCode): UsageItem {
  return {
    productCode,
    key: PRODUCT_ACCENT[productCode],
    title: PRODUCT_TITLE[productCode],
    accent: PRODUCT_ACCENT[productCode],
    isSubscribed: false,
    subscription: null,
    usage: null,
  };
}

function SubscriptionCard({
  subscription,
  isCanceling,
  onCancel,
}: SubscriptionCardProps) {
  const currentPeriodEnd = formatBillingDate(subscription.currentPeriodEnd);

  return (
    <article className="cw-billing-subscription-card">
      <div className="cw-billing-subscription-card__top">
        <div>
          <h4>{subscription.name}</h4>
          <div className="cw-billing-subscription-card__status-row">
            <span
              className={`cw-billing-subscription-card__badge${
                subscription.cancelScheduled ? ' is-pending' : ''
              }`}
            >
              {subscription.cancelScheduled ? '해지 예약됨' : '이용중'}
            </span>
            {!subscription.cancelScheduled ? (
              <button
                type="button"
                className="cw-billing-subscription-card__cancel"
                onClick={() => onCancel(subscription)}
                disabled={isCanceling}
              >
                구독 해지
              </button>
            ) : (
              <button
                type="button"
                className="cw-billing-subscription-card__cancel is-disabled"
                disabled
              >
                해지 신청 완료
              </button>
            )}
          </div>
        </div>
      </div>

      <dl className="cw-billing-subscription-card__grid">
        <div>
          <dt>자동 결제 상태</dt>
          <dd>{subscription.cancelScheduled ? '자동 결제 해지 예정' : '자동 결제 사용'}</dd>
        </div>
        <div>
          <dt>다음 결제 예정일</dt>
          <dd>{subscription.nextBillingDate ?? '—'}</dd>
        </div>
        <div>
          <dt>결제 주기</dt>
          <dd>{subscription.billingCycle}</dd>
        </div>
        <div>
          <dt>월 결제 금액</dt>
          <dd>{subscription.monthlyPrice}</dd>
        </div>
        <div className="is-wide">
          <dt>구독 시작일</dt>
          <dd>{formatBillingDate(subscription.startedAt)}부터 구독 시작</dd>
        </div>
      </dl>

      {subscription.cancelScheduled && (
        <p className="cw-billing-subscription-card__notice">
          {currentPeriodEnd}까지는 계속 사용할 수 있고, 이후부터 자동 결제가 중단됩니다.
        </p>
      )}
    </article>
  );
}

function PaymentHistoryPage() {
  const [periodFilter, setPeriodFilter] = useState<PaymentHistoryPeriod>(
    PAYMENT_HISTORY_PERIOD.SIX_MONTHS
  );
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionCardItem | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState('');

  const {
    data: subscriptions = [],
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useMySubscriptions();
  const { data: products = [] } = useProducts();
  const {
    data: paymentHistoryPage,
    isLoading: isPaymentHistoryLoading,
    isError: isPaymentHistoryError,
  } = usePaymentHistory({
    period: periodFilter,
    page: page - 1,
    size: PAGE_SIZE,
  });
  const cancelSubscription = useCancelSubscription();

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.productCode, product])),
    [products]
  );

  const activeSubscriptions = useMemo(() => {
    return subscriptions
      .filter((subscription) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
      )
      .map((subscription) => {
        const product = productMap.get(subscription.productCode);
        return {
          subscriptionId: subscription.subscriptionId,
          productCode: subscription.productCode,
          name: subscription.productName,
          cancelScheduled:
            subscription.status === SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
          nextBillingDate: formatBillingDate(subscription.nextBillingAt),
          billingCycle: '매월 정기 결제',
          monthlyPrice: formatPrice(product?.price),
          startedAt: subscription.startedAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
        };
      });
  }, [productMap, subscriptions]);

  const recommendationItems = useMemo(() => {
    const activeCodes = new Set(
      activeSubscriptions.map((subscription) => subscription.productCode)
    );

    return ALL_PRODUCT_CODES.filter((productCode) => !activeCodes.has(productCode))
      .map((productCode) => buildRecommendationItem(productCode));
  }, [activeSubscriptions]);

  const payments = paymentHistoryPage?.content ?? [];
  const totalPages = Math.max(1, paymentHistoryPage?.totalPages ?? 1);
  const noSubscriptions = activeSubscriptions.length === 0;
  const singleRecommendation = recommendationItems[0] ?? null;

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function handleCancelConfirm() {
    if (!cancelTarget || cancelSubscription.isPending) return;

    try {
      await cancelSubscription.mutateAsync({
        subscriptionId: cancelTarget.subscriptionId,
        payload: { reason: CANCEL_REASON },
      });
      setSuccessMessage('구독 해지 신청이 완료되었습니다.');
      setCancelTarget(null);
    } catch {
      setSuccessMessage('');
    }
  }

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
                <SubscriptionCard
                  subscription={activeSubscriptions[0]}
                  isCanceling={cancelSubscription.isPending}
                  onCancel={setCancelTarget}
                />
                <RecommendationCard item={singleRecommendation} />
              </div>
            ) : (
              <div className="cw-billing-subscription-layout">
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.subscriptionId}
                    subscription={subscription}
                    isCanceling={cancelSubscription.isPending}
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
                  {PERIOD_OPTIONS.map((option) => (
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
              <div className="cw-billing-payment-list">
                <div className="cw-billing-payment-list__head">
                  <span>상품명</span>
                  <span>결제일</span>
                  <span>결제 금액</span>
                </div>

                {payments.map((payment) => (
                  <article
                    className="cw-billing-payment-item"
                    key={payment.paymentId}
                  >
                    <div className="cw-billing-payment-item__cell is-product">
                      <small>상품명</small>
                      <strong>{payment.productName}</strong>
                    </div>
                    <div className="cw-billing-payment-item__cell">
                      <small>결제일</small>
                      <strong>{formatBillingDate(payment.paidAt)}</strong>
                    </div>
                    <div className="cw-billing-payment-item__cell">
                      <small>결제 금액</small>
                      <strong>{formatPrice(payment.amount)}</strong>
                    </div>
                  </article>
                ))}
              </div>
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
              {noticeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>
      </div>

      {cancelTarget && (
        <div
          className="cw-subscription-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-cancel-title"
        >
          <div
            className="cw-subscription-modal__backdrop"
            onClick={() =>
              !cancelSubscription.isPending && setCancelTarget(null)
            }
          />
          <div className="cw-subscription-modal__dialog">
            <div className="cw-subscription-modal__icon">
              <CalendarClock size={20} />
            </div>
            <h3 id="subscription-cancel-title">구독을 해지하시겠어요?</h3>
            <p>
              {cancelTarget.name} 구독을 해지하면 다음 결제일부터 자동 결제가
              중단됩니다. 남은 이용 기간 동안은 계속 사용할 수 있어요.
            </p>

            <div className="cw-subscription-modal__actions">
              <button
                type="button"
                className="cw-subscription-modal__danger"
                onClick={handleCancelConfirm}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? '처리 중...' : '해지하기'}
              </button>
              <button
                type="button"
                className="cw-subscription-modal__ghost"
                onClick={() => setCancelTarget(null)}
                disabled={cancelSubscription.isPending}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PaymentHistoryPage;
