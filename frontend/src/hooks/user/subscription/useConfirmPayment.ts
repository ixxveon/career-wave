import { useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../../api/user/subscription/billingApi';
import { subscriptionQueryKeys } from './queryKeys';
import type {
  ConfirmPaymentRequest,
  ConfirmOneTimePaymentRequest,
} from '../../../types/user/subscription';

function invalidateSubscriptionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.mySubscriptions() });
  queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.usages() });
  queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.entitlements() });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConfirmPaymentRequest) => billingApi.confirmPayment(request),
    onSuccess: () => invalidateSubscriptionQueries(queryClient),
  });
}

// 일반결제(단건, 토스페이 QR) 승인 — 자동결제 계약 없이 구독을 개통하는 흐름
export function useConfirmOneTimePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConfirmOneTimePaymentRequest) => billingApi.confirmOneTimePayment(request),
    onSuccess: () => invalidateSubscriptionQueries(queryClient),
  });
}
