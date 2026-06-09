import { useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../../api/user/subscription/billingApi';
import { subscriptionQueryKeys } from './queryKeys';
import type { ConfirmPaymentRequest } from '../../../types/user/subscription';

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConfirmPaymentRequest) => billingApi.confirmPayment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.mySubscriptions() });
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.usages() });
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.entitlements() });
    },
  });
}
