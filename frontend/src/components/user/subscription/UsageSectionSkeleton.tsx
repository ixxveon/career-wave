import { ALL_PRODUCT_CODES } from '../../../utils/user/subscription/subscriptionView';

export function UsageSectionSkeleton() {
  return (
    <div className="cw-subscription-usage-grid" aria-busy="true" aria-label="구독 현황 불러오는 중">
      {ALL_PRODUCT_CODES.map((code) => (
        <div key={code} className="cw-subscription-usage-card is-loading" />
      ))}
    </div>
  );
}
