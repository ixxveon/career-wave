import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/user/subscription/subscriptionApi';
import { subscriptionQueryKeys } from './queryKeys';

export function useProducts() {
  return useQuery({
    queryKey: subscriptionQueryKeys.products(),
    queryFn: () => subscriptionApi.getProducts(),
  });
}
