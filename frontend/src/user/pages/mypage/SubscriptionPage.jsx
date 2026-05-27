import { Link } from 'react-router-dom';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  Headphones,
  MessageSquareMore,
  Mic,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react';
import './MyPage.css';

const serviceCards = [
  {
    key: 'document',
    title: '서류 AI 코칭',
    description: '가이드와 피드백을 보면서 차근차근 서류 완성도를 끌어올릴 수 있어요.',
    href: '/billing/checkout',
    icon: FileText,
    accent: 'document',
    highlights: ['답변 전에 가이드 보고', '답변하고 바로 코칭 받고', '리포트개선 포인트 확인'],
    footer: '서류 준비가 처음이거나, 자기소개서를 더 정교하게 다듬고 싶은 분',
    bullets: ['자기소개서 AI 분석', '이력서 피드백', '맞춤 개선 제안', 'PDF 리포트 제공'],
  },
  {
    key: 'interview',
    title: 'AI 모의면접',
    description: '가이드 없이 실전처럼 연습하고, 답변 분석과 리포트까지 한 번에 확인할 수 있어요.',
    href: '/billing/checkout',
    icon: Mic,
    accent: 'interview',
    highlights: ['다양한 꼬리질문 대응', '분석 리포트로 합격 진단', '답변 준비 시간 1분 제한'],
    footer: '실전 감각을 익히고 싶은 분, 돌발 질문 대응력을 키우고 싶은 분',
    bullets: ['실전 면접 연습', '답변 분석', 'AI 피드백 리포트', '면접 결과 저장'],
  },
];

const subscriptionUsage = {
  documentCoaching: {
    key: 'document',
    title: '서류 AI 코칭',
    isSubscribed: true,
    total: 20,
    used: 12,
    nextBillingDate: '2026.06.28',
    accent: 'document',
    recommendHref: '/billing/document-coaching/plans',
    recommendDescription: '가이드와 피드백을 보면서 서류 완성도를 더 빠르게 끌어올릴 수 있어요.',
    recommendButton: '서류 AI 코칭 알아보기',
  },
  interview: {
    key: 'interview',
    title: 'AI 모의면접',
    isSubscribed: true,
    total: 10,
    used: 0,
    nextBillingDate: '2026.06.28',
    accent: 'interview',
    recommendHref: '/billing/interview/plans',
    recommendDescription: '실전처럼 면접을 연습하고 답변 분석 리포트를 받아볼 수 있어요.',
    recommendButton: 'AI 모의면접 알아보기',
  },
};

const noticeSections = [
  {
    title: 'AI 서비스 이용 안내',
    icon: Sparkles,
    items: [
      'AI 서비스는 결제 완료 후 즉시 이용할 수 있습니다.',
      '서류 AI 코칭과 AI 모의면접은 각각 별도의 구독 상품으로 운영됩니다.',
      '월 제공 횟수는 상품별로 다르게 제공되며, 매월 결제일을 기준으로 새롭게 갱신됩니다.',
      '사용하지 않은 제공 횟수는 다음 결제 주기로 이월되지 않습니다.',
      'AI 분석 결과는 입력한 정보와 답변 내용을 기반으로 생성되며, 실제 채용 결과를 보장하지 않습니다.',
      'AI 모의면접 이용 시 마이크 권한 허용이 필요할 수 있습니다.',
    ],
  },
  {
    title: '자동 결제 및 구독 해지 안내',
    icon: RefreshCw,
    items: [
      '구독 상품은 매월 결제일에 자동으로 정기 결제됩니다.',
      '결제일은 최초 구독 결제가 완료된 날짜를 기준으로 설정됩니다.',
      '구독 해지는 이 페이지의 내 구독 내역 영역에서 신청할 수 있습니다.',
      '구독 해지 버튼을 누르면 다음 결제일부터 자동 결제가 중단됩니다.',
      '구독을 해지하더라도 이미 결제된 이용 기간 동안은 서비스를 계속 이용할 수 있습니다.',
      '결제 후 서비스를 전혀 이용하지 않은 경우에 한해 환불이 가능할 수 있습니다.',
      '제공 횟수를 일부 사용한 경우 환불이 제한되거나 부분 환불 기준이 적용될 수 있습니다.',
      '결제 오류, 중복 결제 등 시스템 문제로 발생한 결제 건은 확인 후 별도 처리됩니다.',
    ],
  },
  {
    title: '문의 및 유의사항',
    icon: Headphones,
    items: [
      '서비스 이용 중 오류가 발생한 경우 고객센터를 통해 문의해주세요.',
      '문의 시 결제일, 상품명, 오류 화면 또는 발생 상황을 함께 전달하면 더 빠르게 확인할 수 있습니다.',
      'AI 서비스에서 제공되는 피드백은 학습 및 취업 준비 보조 목적으로 제공됩니다.',
      '부정확한 입력 정보나 불완전한 답변을 제출한 경우 분석 결과의 정확도가 낮아질 수 있습니다.',
      '타인의 개인정보, 허위 정보, 부적절한 내용 입력은 제한될 수 있습니다.',
      '서비스 점검 또는 외부 API 장애 상황에서는 일시적으로 이용이 제한될 수 있습니다.',
    ],
  },
];

function UsageStatusCard({ item }) {
  const remaining = item.total - item.used;
  const percent = Math.round((item.used / item.total) * 100);
  const usageBoxes = Array.from({ length: item.total }, (_, index) => index < item.used);

  return (
    <article className={`cw-subscription-usage-card is-${item.accent}`}>
      <div className="cw-subscription-usage-card__summary">
        <div className="cw-subscription-usage-card__heading">
          <h3>{item.title}</h3>
          <span className="cw-subscription-usage-card__meta">
            {item.total}회 중 {item.used}회 사용
          </span>
        </div>
        <strong>{percent}%</strong>
      </div>

      <div className="cw-subscription-usage-card__body">
        <div className="cw-subscription-usage-track" aria-hidden="true">
          {usageBoxes.map((filled, index) => (
            <span key={`${item.key}-${index}`} className={filled ? 'is-filled' : ''}>
              <Star size={18} fill="currentColor" strokeWidth={1.8} />
            </span>
          ))}
        </div>

        <dl className="cw-subscription-usage-stats">
          <div>
            <dt>남은 횟수</dt>
            <dd>{remaining}회</dd>
          </div>
          <div>
            <dt>사용률</dt>
            <dd>{percent}%</dd>
          </div>
          <div>
            <dt>다음 결제일</dt>
            <dd>{item.nextBillingDate}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function RecommendationCard({ item }) {
  return (
    <article className={`cw-subscription-recommend-card is-${item.accent}`}>
      <div className="cw-subscription-recommend-card__icon">
        {item.accent === 'document' ? <FileText size={22} /> : <Mic size={22} />}
      </div>
      <div className="cw-subscription-recommend-card__body">
        <span>추천 서비스</span>
        <h3>{item.title}도 함께 시작해보세요</h3>
        <p>{item.recommendDescription}</p>
      </div>
      <Link to={item.recommendHref} className="cw-subscription-recommend-card__button">
        {item.recommendButton}
      </Link>
    </article>
  );
}

function SubscriptionPage() {
  const usageItems = [subscriptionUsage.documentCoaching, subscriptionUsage.interview];
  const subscribedItems = usageItems.filter((item) => item.isSubscribed);
  const unsubscribedItems = usageItems.filter((item) => !item.isSubscribed);
  const hasNoSubscription = subscribedItems.length === 0;
  const hasPartialSubscription = subscribedItems.length === 1;

  return (
    <>
      <div className="cw-mypage-layout">
        <aside className="cw-mypage-sidebar">
          <strong>마이페이지</strong>
          <nav>
            <Link to="/mypage">내 정보 관리</Link>
            <Link to="/mypage/favorites">스크랩 공고</Link>
            <Link to="/mypage/subscription" className="is-active">
              AI 서비스
            </Link>
            <Link to="/mypage/payment-history">구독/결제 내역</Link>
          </nav>
        </aside>

        <section className="cw-dashboard-section cw-subscription-page">
          <div className="cw-subscription-hero">
            <div className="cw-subscription-hero__content">
              <div className="cw-subscription-hero__copy">
                <p className="cw-subscription-hero__eyebrow">AI 서비스</p>
                <p className="cw-subscription-hero__intro">
                  서류 AI 코칭과 AI 모의면접이 처음이라면, 무료 체험으로 나에게 맞는 준비 루틴을 시작해보세요.
                </p>
                <h2>
                  <span>무료 체험권,</span> 슬쩍 넣어드렸어요.
                </h2>
                <p className="cw-subscription-hero__body-copy">
                  서류 AI 코칭과 AI 모의면접을 한 곳에서 비교하고, 지금 내 구독 상태와 사용 현황까지
                  바로 관리할 수 있어요.
                </p>
                <small className="cw-subscription-hero__note">
                  비구독 사용자도 각 상품별 1회 무료 체험 제공
                </small>
              </div>

              <div className="cw-subscription-hero__visual" aria-hidden="true">
                <div className="cw-subscription-hero__spark is-one" />
                <div className="cw-subscription-hero__spark is-two" />
                <div className="cw-subscription-hero__ticket">
                  <span>FREE</span>
                </div>
                <div className="cw-subscription-hero__device">
                  <Bot size={22} />
                  <div>
                    <span>AI CARE</span>
                    <strong>Document + Interview</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="cw-subscription-hero__aside">
              <Link to="/documents/resume" className="cw-subscription-hero__cta">
                서류 AI 코칭 체험하기
              </Link>
              <Link to="/interview" className="cw-subscription-hero__cta">
                AI 모의면접 체험하기
              </Link>
            </div>
          </div>

          <section className="cw-subscription-section">
            <div className="cw-subscription-section__head">
              <div>
                <h3>AI 서비스 소개</h3>
                <p>필요한 서비스부터 살펴보고, 상세 상품 페이지에서 이용권을 확인해보세요.</p>
              </div>
            </div>

            <div className="cw-subscription-carousel" role="list">
              {serviceCards.map((service) => {
                const Icon = service.icon;
                return (
                  <article
                    className={`cw-subscription-service-card is-${service.accent}`}
                    key={service.key}
                    role="listitem"
                  >
                    <div className="cw-subscription-service-card__hero">
                      <div className="cw-subscription-service-card__copy">
                        <h4>{service.title}</h4>
                        <p>{service.description}</p>
                      </div>
                      <div className={`cw-subscription-service-card__visual is-${service.key}`}>
                        {service.key === 'document' ? (
                          <>
                            <div className="cw-subscription-service-card__visual-doc">
                              <FileText size={18} />
                            </div>
                            <div className="cw-subscription-service-card__visual-cloud">?</div>
                            <div className="cw-subscription-service-card__visual-main is-bubble">
                              <MessageSquareMore size={34} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="cw-subscription-service-card__visual-chat is-middle">
                              <Mic size={28} />
                            </div>
                            <div className="cw-subscription-service-card__visual-chat is-bottom">
                              <Sparkles size={18} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <ul>
                      {service.bullets.map((bullet) => (
                        <li key={bullet}>
                          <CheckCircle2 size={15} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="cw-subscription-service-card__features">
                      {service.highlights.map((highlight) => (
                        <div key={highlight}>
                          <strong>{highlight}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="cw-subscription-service-card__cta-wrap">
                      <Link to={service.href} className="cw-subscription-service-card__button">
                        구매하기
                      </Link>
                    </div>

                    <p className="cw-subscription-service-card__footer">
                      <CheckCircle2 size={16} />
                      <span>{service.footer}</span>
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="cw-subscription-section cw-subscription-section--plain">
            <div className="cw-subscription-section__head">
              <div>
                <h3>AI 서비스 이용 현황</h3>
                <p>현재 구독 상태에 따라 이용 현황과 남은 횟수를 확인할 수 있어요.</p>
              </div>
            </div>

            {hasNoSubscription ? (
              <div className="cw-subscription-empty cw-subscription-empty--plain">
                <div className="cw-subscription-empty__illustration" aria-hidden="true">
                  <div className="cw-subscription-empty__device">
                    <Sparkles size={18} />
                    <span />
                    <span />
                  </div>
                  <div className="cw-subscription-empty__person" />
                </div>
                <strong>이용중인 AI 서비스가 없어요.</strong>
                <p>AI 서비스를 시작하고 맞춤 리포트를 받아보세요.</p>
                <div className="cw-subscription-empty__actions">
                  <Link to="/documents/resume" className="cw-subscription-empty__button">
                    서류 AI 코칭 체험하기
                  </Link>
                  <Link to="/interview" className="cw-subscription-empty__button">
                    AI 모의면접 체험하기
                  </Link>
                </div>
              </div>
            ) : hasPartialSubscription ? (
              <div className="cw-subscription-usage-grid">
                <UsageStatusCard item={subscribedItems[0]} />
                <RecommendationCard item={unsubscribedItems[0]} />
              </div>
            ) : (
              <div className="cw-subscription-usage-grid">
                {subscribedItems.map((item) => (
                  <UsageStatusCard item={item} key={item.key} />
                ))}
              </div>
            )}
          </section>

          <section className="cw-subscription-notice-grid">
            {noticeSections.map((section) => {
              const Icon = section.icon;
              return (
                <article className="cw-subscription-notice-card" key={section.title}>
                  <div className="cw-subscription-notice-card__title">
                    <span>
                      <Icon size={18} />
                    </span>
                    <h4>{section.title}</h4>
                  </div>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>
        </section>
      </div>
    </>
  );
}

export default SubscriptionPage;
