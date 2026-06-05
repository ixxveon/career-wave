import { useQuery } from '@tanstack/react-query';
import { billingApi } from '../../api/subscription/billingApi';
import { subscriptionQueryKeys } from './queryKeys';

export function usePaymentStatus(orderId: string | null) {
  return useQuery({
    queryKey: subscriptionQueryKeys.paymentStatus(orderId ?? ''),
    queryFn: () => billingApi.getPaymentStatus(orderId!),
    enabled: !!orderId,
  });
}
