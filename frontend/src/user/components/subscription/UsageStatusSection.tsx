import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UsageItem } from '../../types/subscription';
import { UsageStatusCard } from './UsageStatusCard';
import { RecommendationCard } from './RecommendationCard';
import { UsageSectionSkeleton } from './UsageSectionSkeleton';

type UsageStatusSectionProps = {
  isLoading: boolean;
  isError: boolean;
  subscribedItems: UsageItem[];
  unsubscribedItems: UsageItem[];
  hasNoSubscription: boolean;
  hasPartialSubscription: boolean;
};

export function UsageStatusSection({
  isLoading,
  isError,
  subscribedItems,
  unsubscribedItems,
  hasNoSubscription,
  hasPartialSubscription,
}: UsageStatusSectionProps) {
  return (
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
  );
}
