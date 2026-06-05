import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../../api/subscription/subscriptionApi';
import { subscriptionQueryKeys } from './queryKeys';

export function useEntitlements() {
  return useQuery({
    queryKey: subscriptionQueryKeys.entitlements(),
    queryFn: () => subscriptionApi.getEntitlements(),
    select: (data) => data.entitlements,
  });
}
