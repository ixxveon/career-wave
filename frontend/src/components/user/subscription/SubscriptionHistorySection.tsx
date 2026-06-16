import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type PaymentHistorySubscriptionCardItem, type UsageItem } from '../../../types/user/subscription';
import { PaymentHistorySubscriptionCard } from './PaymentHistorySubscriptionCard';
import { RecommendationCard } from './RecommendationCard';

type SubscriptionHistorySectionProps = {
  successMessage: string;
  isLoading: boolean;
  isError: boolean;
  noSubscriptions: boolean;
  activeSubscriptions: PaymentHistorySubscriptionCardItem[];
  singleRecommendation: UsageItem | null;
  isCanceling: boolean;
  onCancel: (subscription: PaymentHistorySubscriptionCardItem) => void;
};

export function SubscriptionHistorySection({
  successMessage,
  isLoading,
  isError,
  noSubscriptions,
  activeSubscriptions,
  singleRecommendation,
  isCanceling,
  onCancel,
}: SubscriptionHistorySectionProps) {
  return (
    <section className="cw-subscription-section cw-billing-section">
      <div className="cw-account-header">
        <div>
          <span className="cw-account-badge">BILLING HISTORY</span>
          <h2>내 구독 내역</h2>
          <p>현재 이용중인 상품과 자동 결제 상태를 실무적으로 확인할 수 있도록 정리했어요.</p>
        </div>
      </div>

      {successMessage && (
        <div className="cw-billing-success-toast" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="cw-billing-empty-state">
          <div>
            <strong>구독 정보를 불러오는 중이에요.</strong>
            <p>현재 구독 상태와 자동 결제 정보를 잠시만 기다려주세요.</p>
          </div>
        </div>
      ) : isError ? (
        <div className="cw-billing-empty-state">
          <div>
            <strong>구독 정보를 불러오지 못했어요.</strong>
            <p>잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      ) : noSubscriptions ? (
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
      ) : activeSubscriptions.length === 1 && singleRecommendation ? (
        <div className="cw-billing-subscription-layout is-single">
          <PaymentHistorySubscriptionCard
            subscription={activeSubscriptions[0]}
            isCanceling={isCanceling}
            onCancel={onCancel}
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
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}
