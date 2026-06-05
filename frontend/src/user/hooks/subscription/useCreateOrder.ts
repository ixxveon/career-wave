import { useMutation } from '@tanstack/react-query';
import { billingApi } from '../../api/subscription/billingApi';
import type { CreateOrderRequest } from '../../types/subscription';

export function useCreateOrder() {
  return useMutation({
    mutationFn: (request: CreateOrderRequest) => billingApi.createOrder(request),
  });
}
