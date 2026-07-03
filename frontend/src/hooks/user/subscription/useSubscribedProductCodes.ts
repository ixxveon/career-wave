import { useMySubscriptions } from './useMySubscriptions';
import { isActiveSubscriptionStatus } from '../../../utils/user/subscription/subscriptionView';
import type { ProductCode } from '../../../types/user/subscription';

/**
 * 현재 구매(신규 결제)가 차단되는 "구독중" 상품코드 집합을 반환한다.
 * 판정 기준은 백엔드의 중복 구독 차단 로직과 동일한 상태(ACTIVE/CANCEL_SCHEDULED/PAYMENT_FAILED)이며,
 * 구매 버튼 노출 조건과 결제 화면 진입 방어에 함께 사용한다. (이슈 #1007)
 */
export function useSubscribedProductCodes() {
  const { data: subscriptions, isLoading, isError } = useMySubscriptions();

  const subscribedCodes = new Set<ProductCode>(
    (subscriptions ?? [])
      .filter((s) => isActiveSubscriptionStatus(s.status))
      .map((s) => s.productCode),
  );

  return { subscribedCodes, isLoading, isError };
}
