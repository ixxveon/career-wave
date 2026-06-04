import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../../api/subscription/subscriptionApi';
import { subscriptionQueryKeys } from './queryKeys';

export function useUsages() {
  return useQuery({
    queryKey: subscriptionQueryKeys.usages(),
    queryFn: () => subscriptionApi.getUsages(),
    select: (data) => data.usages,
  });
}
