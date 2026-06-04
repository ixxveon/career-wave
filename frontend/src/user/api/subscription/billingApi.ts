import { memberApiClient } from '../member/memberApiClient';
import type { PaymentHistoryPageResponse, PaymentHistoryQuery } from '../../types/subscription';

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
    return memberApiClient<PaymentHistoryPageResponse>(`/api/v1/billing/payments/history?${search}`, {
      auth: true,
    });
  },
};
