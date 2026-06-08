import { Link } from 'react-router-dom';
import './MyPage.css';
import { useSubscriptionStatus } from '../../../hooks/user/subscription';
import { SubscriptionHero } from '../../../components/user/subscription/SubscriptionHero';
import { ServiceCardsSection } from '../../../components/user/subscription/ServiceCardsSection';
import { UsageStatusSection } from '../../../components/user/subscription/UsageStatusSection';
import { NoticeSectionsGrid } from '../../../components/user/subscription/NoticeSectionsGrid';

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
          <SubscriptionHero />
          <ServiceCardsSection />
          <UsageStatusSection
            isLoading={isLoading}
            isError={isError}
            subscribedItems={subscribedItems}
            unsubscribedItems={unsubscribedItems}
            hasNoSubscription={hasNoSubscription}
            hasPartialSubscription={hasPartialSubscription}
          />
          <NoticeSectionsGrid />
        </section>
      </div>
    </>
  );
}

export default SubscriptionPage;
