import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../../../api/user/subscription/subscriptionApi';
import type { CancelSubscriptionRequest } from '../../../types/user/subscription';
import { subscriptionQueryKeys } from './queryKeys';

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, payload }: { subscriptionId: string; payload: CancelSubscriptionRequest }) =>
      subscriptionApi.cancelSubscription(subscriptionId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.mySubscriptions() }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.usages() }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.entitlements() }),
      ]);
    },
  });
}
