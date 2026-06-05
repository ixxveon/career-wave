import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../../api/subscription/subscriptionApi';
import { subscriptionQueryKeys } from './queryKeys';

export function useMySubscriptions() {
  return useQuery({
    queryKey: subscriptionQueryKeys.mySubscriptions(),
    queryFn: () => subscriptionApi.getMySubscriptions(),
    select: (data) => data.subscriptions,
  });
}
