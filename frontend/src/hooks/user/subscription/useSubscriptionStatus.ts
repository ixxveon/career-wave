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
  const hasNoSubscription = subscribedItems.length === 0;
  const hasPartialSubscription = subscribedItems.length === 1;

  return {
    isLoading,
    isError,
    subscribedItems,
    unsubscribedItems,
    hasNoSubscription,
    hasPartialSubscription,
  };
}
