import { useMutation } from '@tanstack/react-query';
import { billingApi } from '../../../api/user/subscription/billingApi';
import type { CreateOrderRequest } from '../../../types/user/subscription';

export function useCreateOrder() {
  return useMutation({
    mutationFn: (request: CreateOrderRequest) => billingApi.createOrder(request),
  });
}
