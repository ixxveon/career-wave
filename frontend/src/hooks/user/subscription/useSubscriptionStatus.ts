import { SUBSCRIPTION_STATUS } from '../../../types/user/subscription';
import { buildUsageItems } from '../../../utils/user/subscription/subscriptionView';
import { useMySubscriptions } from './useMySubscriptions';
import { useUsages } from './useUsages';

export function useSubscriptionStatus() {
  const subscriptionsQuery = useMySubscriptions();
  const usagesQuery = useUsages();

  const isLoading = subscriptionsQuery.isLoading || usagesQuery.isLoading;
  const isError = subscriptionsQuery.isError || usagesQuery.isError;

  const allItems = buildUsageItems(
    subscriptionsQuery.data ?? [],
    usagesQuery.data ?? [],
  );

  const subscribedItems = allItems.filter((item) => item.isSubscribed);
  const unsubscribedItems = allItems.filter((item) => !item.isSubscribed);
  // 구매 차단 대상이라 isSubscribed는 false지만, 한 번도 구독한 적 없는 사용자와는
  // 구분해서 안내해야 하는 상태 — 취소가 아니라 환불 처리 중인 상태이므로.
  const refundPendingItems = unsubscribedItems.filter(
    (item) => item.subscription?.status === SUBSCRIPTION_STATUS.REFUND_PENDING,
  );
  const hasNoSubscription = subscribedItems.length === 0;
  const hasPartialSubscription = subscribedItems.length === 1;

  return {
    isLoading,
    isError,
    subscribedItems,
    unsubscribedItems,
    refundPendingItems,
    hasNoSubscription,
    hasPartialSubscription,
  };
}
