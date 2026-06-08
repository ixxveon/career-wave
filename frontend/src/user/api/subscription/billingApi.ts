import { memberApiClient } from '../member/memberApiClient';
import type {
  PaymentHistoryPageResponse,
  PaymentHistoryQuery,
  CreateOrderRequest,
  CreateOrderResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  PaymentStatusResponse,
  RecordPaymentFailRequest,
  RecordPaymentFailResponse,
} from '../../types/subscription';

function buildPaymentHistorySearchParams(query: PaymentHistoryQuery): string {
  const searchParams = new URLSearchParams({
    period: query.period,
    page: String(query.page),
    size: String(query.size),
  });

  return searchParams.toString();
}

export const billingApi = {
  getPaymentHistory(query: PaymentHistoryQuery): Promise<PaymentHistoryPageResponse> {
    const search = buildPaymentHistorySearchParams(query);
    return memberApiClient<PaymentHistoryPageResponse>(`/api/v1/user/billing/payments/history?${search}`, {
      auth: true,
    });
  },

  createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
    return memberApiClient<CreateOrderResponse>('/api/v1/user/billing/checkout/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    });
  },

  confirmPayment(body: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    return memberApiClient<ConfirmPaymentResponse>('/api/v1/user/billing/payments/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    });
  },

  getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    return memberApiClient<PaymentStatusResponse>(`/api/v1/user/billing/payments/orders/${orderId}`, {
      auth: true,
    });
  },

  recordPaymentFail(body: RecordPaymentFailRequest): Promise<RecordPaymentFailResponse> {
    return memberApiClient<RecordPaymentFailResponse>('/api/v1/user/billing/payments/fail', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    });
  },
};
