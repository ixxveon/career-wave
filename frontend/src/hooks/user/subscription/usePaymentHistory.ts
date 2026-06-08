import { useQuery } from '@tanstack/react-query';
import { billingApi } from '../../../api/user/subscription/billingApi';
import type { PaymentHistoryQuery } from '../../../types/user/subscription';
import { subscriptionQueryKeys } from './queryKeys';

export function usePaymentHistory(query: PaymentHistoryQuery) {
  return useQuery({
    queryKey: subscriptionQueryKeys.paymentHistory(query.period, query.page, query.size),
    queryFn: () => billingApi.getPaymentHistory(query),
  });
}
