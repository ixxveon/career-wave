import MyPageSidebar from '../../../components/user/mypage/MyPageSidebar';
import '@/styles/user/mypage/MyPage.css';
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
        <MyPageSidebar />

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
