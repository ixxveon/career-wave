import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import './MyPage.css';

type MockMode = 'empty' | 'filled';

type SubscriptionItem = {
  id: 'document-coaching' | 'interview';
  name: string;
  isActive: boolean;
  autoBilling: boolean;
  cancelScheduled: boolean;
  nextBillingDate: string | null;
  billingCycle: string;
  monthlyPrice: string;
  startedAt: string | null;
  description: string;
  href: string;
};

type PaymentHistoryItem = {
  id: number;
  date: string;
  name: string;
  amount: string;
};

type SubscriptionCardProps = {
  subscription: SubscriptionItem;
  onCancel: (subscription: SubscriptionItem) => void;
};

type RecommendationCardProps = {
  subscription: SubscriptionItem;
};

// Mock view switches
// - subscriptionMockMode
//   - 'empty': 이용중인 구독 상품이 없는 화면
//   - 'filled': 구독중인 상품 카드와 추천 상품 카드가 함께 보이는 화면
// - paymentHistoryMockMode
//   - 'empty': 신규 사용자처럼 최근 결제 내역이 없는 화면
//   - 'filled': 최근 결제 내역 리스트가 보이는 화면
const mockModes: { subscription: MockMode; paymentHistory: MockMode } = {
  subscription: 'empty',
  paymentHistory: 'filled',
};

const subscriptionMockMode = mockModes.subscription;
const paymentHistoryMockMode = mockModes.paymentHistory;

const subscriptionItems: SubscriptionItem[] = [
  {
    id: 'document-coaching',
    name: '서류 AI 코칭 플랜',
    isActive: true,
    autoBilling: false,
    cancelScheduled: false,
    nextBillingDate: '2026.06.27',
    billingCycle: '매월 정기 결제',
    monthlyPrice: '₩29,000',
    startedAt: '2026.05.27',
    description: '자기소개서와 이력서를 더 빠르게 다듬고 싶은 분께 추천하는 서류 코칭 구독 상품이에요.',
    href: '/mypage/subscription',
  },
  {
    id: 'interview',
    name: 'AI 모의면접 스타터 플랜',
    isActive: false,
    autoBilling: false,
    cancelScheduled: false,
    nextBillingDate: null,
    billingCycle: '매월 정기 결제',
    monthlyPrice: '₩29,000',
    startedAt: null,
    description: '실전처럼 면접을 연습하고 답변 분석 리포트까지 받아볼 수 있는 인터뷰 구독 상품이에요.',
    href: '/mypage/subscription',
  },
];
const initialSubscriptions =
  subscriptionMockMode === 'filled'
    ? subscriptionItems
    : subscriptionItems.map((subscription) => ({
        ...subscription,
        isActive: false,
        autoBilling: false,
        cancelScheduled: false,
        nextBillingDate: null,
        startedAt: null,
      }));

const paymentHistoryItems: PaymentHistoryItem[] = [
  {
    id: 1,
    date: '2026.05.27',
    name: '서류 AI 코칭 플랜',
    amount: '₩29,000',
  },
  {
    id: 2,
    date: '2026.05.21',
    name: 'AI 모의면접 스타터 플랜',
    amount: '₩29,000',
  },
  {
    id: 3,
    date: '2026.05.09',
    name: 'AI 모의면접 스타터 플랜',
    amount: '₩29,000',
  },
  {
    id: 4,
    date: '2026.04.27',
    name: '서류 AI 코칭 플랜',
    amount: '₩29,000',
  },
  {
    id: 5,
    date: '2026.03.19',
    name: '서류 AI 코칭 플랜',
    amount: '₩29,000',
  },
  {
    id: 6,
    date: '2026.02.11',
    name: 'AI 모의면접 스타터 플랜',
    amount: '₩29,000',
  },
];

// `paymentHistoryMockMode` 값에 따라 최근 결제 내역 UI를 전환합니다.
const paymentHistory = paymentHistoryMockMode === 'filled' ? paymentHistoryItems : [];

const periodOptions = [
  '최근 1개월',
  '최근 3개월',
  '최근 6개월',
  '최근 1년',
  '지난 5년',
  '기간 설정',
];

const PAGE_SIZE = 5;
const FILTER_REFERENCE_DATE = new Date('2026-05-28T00:00:00');

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

function parsePaymentDate(value: string): Date {
  const [year, month, day] = value.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function isWithinPeriod(date: string, period: string): boolean {
  if (period === '기간 설정') return true;

  const candidate = parsePaymentDate(date);
  const diffTime = FILTER_REFERENCE_DATE.getTime() - candidate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  switch (period) {
    case '최근 1개월':
      return diffDays <= 31;
    case '최근 3개월':
      return diffDays <= 92;
    case '최근 6개월':
      return diffDays <= 183;
    case '최근 1년':
      return diffDays <= 366;
    case '지난 5년':
      return diffDays <= 366 * 5;
    default:
      return true;
  }
}

function SubscriptionCard({ subscription, onCancel }: SubscriptionCardProps) {
  return (
    <article className="cw-billing-subscription-card">
      <div className="cw-billing-subscription-card__top">
        <div>
          <h4>{subscription.name}</h4>
          <div className="cw-billing-subscription-card__status-row">
            <span className={`cw-billing-subscription-card__badge${subscription.cancelScheduled ? ' is-pending' : ''}`}>
              {subscription.cancelScheduled ? '해지 예약됨' : '이용중'}
            </span>
            {!subscription.cancelScheduled ? (
              <button type="button" className="cw-billing-subscription-card__cancel" onClick={() => onCancel(subscription)}>
                구독 해지
              </button>
            ) : (
              <button type="button" className="cw-billing-subscription-card__cancel is-disabled" disabled>
                해지 신청 완료
              </button>
            )}
          </div>
        </div>
      </div>

      <dl className="cw-billing-subscription-card__grid">
        <div>
          <dt>자동 결제 상태</dt>
          <dd>{subscription.cancelScheduled ? '자동 결제 해지 예정' : subscription.autoBilling ? '자동 결제 사용' : '자동 결제 미사용'}</dd>
        </div>
        <div>
          <dt>다음 결제 예정일</dt>
          <dd>{subscription.nextBillingDate ?? '-'}</dd>
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
          <dd>{subscription.startedAt}부터 구독 시작</dd>
        </div>
      </dl>

      {subscription.cancelScheduled && (
        <p className="cw-billing-subscription-card__notice">
          다음 결제일부터 자동 결제가 중단됩니다. 남은 이용 기간 동안은 계속 사용할 수 있어요.
        </p>
      )}
    </article>
  );
}

function RecommendationCard({ subscription }: RecommendationCardProps) {
  return (
    <article className="cw-billing-recommend-card">
      <span>추천 상품</span>
      <h4>{subscription.name}도 함께 시작해보세요</h4>
      <p>{subscription.description}</p>
      <Link to={subscription.href}>알아보기</Link>
    </article>
  );
}

function PaymentHistoryPage() {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionItem[]>(initialSubscriptions);
  const [periodFilter, setPeriodFilter] = useState('최근 6개월');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionItem | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const activeSubscriptions = useMemo(
    () => subscriptionState.filter((subscription) => subscription.isActive),
    [subscriptionState]
  );
  const inactiveSubscriptions = useMemo(
    () => subscriptionState.filter((subscription) => !subscription.isActive),
    [subscriptionState]
  );

  const filteredPayments = useMemo(() => {
    return paymentHistory.filter((payment) => {
      return isWithinPeriod(payment.date, periodFilter);
    });
  }, [periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const noSubscriptions = activeSubscriptions.length === 0;
  const oneSubscription = activeSubscriptions.length === 1;
  const twoSubscriptions = activeSubscriptions.length === 2;

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function handleCancelConfirm() {
    if (!cancelTarget) return;

    setSubscriptionState((current) =>
      current.map((subscription) =>
        subscription.id === cancelTarget.id
          ? {
              ...subscription,
              autoBilling: false,
              cancelScheduled: true,
            }
          : subscription
      )
    );
    setSuccessMessage('구독 해지 신청이 완료되었습니다.');
    setCancelTarget(null);
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
                <p>현재 이용중인 상품과 자동 결제 상태를 실무적으로 확인할 수 있도록 정리했어요.</p>
              </div>
            </div>

            {successMessage && <div className="cw-billing-success-toast">{successMessage}</div>}

            {noSubscriptions && (
              <div className="cw-billing-empty-state">
                <div className="cw-billing-empty-state__icon" aria-hidden="true">
                  <Sparkles size={28} />
                </div>
                <div>
                  <strong>이용중인 구독 상품이 없어요.</strong>
                  <p>필요한 AI 서비스를 살펴보고 지금 내게 맞는 상품을 비교해보세요.</p>
                </div>
                <div className="cw-billing-empty-state__actions">
                  <Link to="/mypage/subscription">알아보기</Link>
                </div>
              </div>
            )}

            {oneSubscription && (
              <div className="cw-billing-subscription-layout is-single">
                <SubscriptionCard subscription={activeSubscriptions[0]} onCancel={setCancelTarget} />
                <RecommendationCard subscription={inactiveSubscriptions[0]} />
              </div>
            )}

            {twoSubscriptions && (
              <div className="cw-billing-subscription-layout">
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionCard key={subscription.id} subscription={subscription} onCancel={setCancelTarget} />
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
                <select value={periodFilter} onChange={(event) => { setPeriodFilter(event.target.value); setPage(1); }}>
                  {periodOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {visiblePayments.length === 0 ? (
              <div className="cw-billing-payment-empty">
                <div className="cw-billing-payment-empty__icon" aria-hidden="true">
                  <Sparkles size={24} />
                </div>
                <strong>아직 최근 결제 내역이 없어요.</strong>
                <p>첫 구독 또는 무료 체험을 시작하면 최근 결제 내역이 이곳에 차곡차곡 쌓여요.</p>
              </div>
            ) : (
              <div className="cw-billing-payment-list">
                <div className="cw-billing-payment-list__head">
                  <span>상품명</span>
                  <span>결제일</span>
                  <span>결제 금액</span>
                </div>

                {visiblePayments.map((payment) => (
                  <article className="cw-billing-payment-item" key={payment.id}>
                    <div className="cw-billing-payment-item__cell is-product">
                      <small>상품명</small>
                      <strong>{payment.name}</strong>
                    </div>
                    <div className="cw-billing-payment-item__cell">
                      <small>결제일</small>
                      <strong>{payment.date}</strong>
                    </div>
                    <div className="cw-billing-payment-item__cell">
                      <small>결제 금액</small>
                      <strong>{payment.amount}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {filteredPayments.length > PAGE_SIZE && (
              <div className="cw-billing-pagination">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((pageValue) => Math.max(1, pageValue - 1))}>
                  <ChevronLeft size={16} />
                  이전
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((pageValue) => Math.min(totalPages, pageValue + 1))}
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
        <div className="cw-subscription-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-cancel-title">
          <div className="cw-subscription-modal__backdrop" onClick={() => setCancelTarget(null)} />
          <div className="cw-subscription-modal__dialog">
            <div className="cw-subscription-modal__icon">
              <CalendarClock size={20} />
            </div>
            <h3 id="subscription-cancel-title">구독을 해지하시겠어요?</h3>
            <p>
              {cancelTarget.name} 구독을 해지하면 다음 결제일부터 자동 결제가 중단됩니다. 남은 이용 기간 동안은
              계속 사용할 수 있어요.
            </p>

            <div className="cw-subscription-modal__actions">
              <button type="button" className="cw-subscription-modal__danger" onClick={handleCancelConfirm}>
                해지하기
              </button>
              <button type="button" className="cw-subscription-modal__ghost" onClick={() => setCancelTarget(null)}>
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
