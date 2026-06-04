import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, FileText, MessageSquareMore, Mic, Sparkles } from 'lucide-react';
import './MyPage.css';
import { useSubscriptionStatus } from '../../hooks/subscription';
import { SERVICE_CARDS, NOTICE_SECTIONS } from '../../utils/subscription/subscriptionContent';
import { UsageStatusCard } from '../../components/subscription/UsageStatusCard';
import { RecommendationCard } from '../../components/subscription/RecommendationCard';
import { UsageSectionSkeleton } from '../../components/subscription/UsageSectionSkeleton';

function SubscriptionPage() {
  const {
    isLoading,
    isError,
    subscribedItems,
    unsubscribedItems,
    hasNoSubscription,
    hasPartialSubscription,
  } = useSubscriptionStatus();

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
              {SERVICE_CARDS.map((service) => (
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
              ))}
            </div>
          </section>

          <section className="cw-subscription-section cw-subscription-section--plain">
            <div className="cw-subscription-section__head">
              <div>
                <h3>AI 서비스 이용 현황</h3>
                <p>현재 구독 상태에 따라 이용 현황과 남은 횟수를 확인할 수 있어요.</p>
              </div>
            </div>

            {isLoading ? (
              <UsageSectionSkeleton />
            ) : isError ? (
              <p className="cw-subscription-error" role="alert">
                이용 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
              </p>
            ) : hasNoSubscription ? (
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
            {NOTICE_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              return (
                <article className="cw-subscription-notice-card" key={section.title}>
                  <div className="cw-subscription-notice-card__title">
                    <span>
                      <SectionIcon size={18} />
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
