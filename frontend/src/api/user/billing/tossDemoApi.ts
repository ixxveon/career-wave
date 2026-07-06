import { memberApiClient } from '../member/memberApiClient';

/**
 * 데모 전용 일반결제(토스페이 QR) API.
 * 기존 자동결제(빌링) billingApi 와 완전히 분리된 엔드포인트를 사용한다. (구독 발급 없음)
 */

export interface TossDemoOrder {
  orderId: string;
  amount: number;
  currency: string;
  orderName: string;
}

export interface TossDemoConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossDemoConfirmResult {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  totalAmount: number;
  currency: string;
  method: string | null;
  easyPayProvider: string | null;
  approvedAt: string | null;
}

export const tossDemoApi = {
  createOrder(): Promise<TossDemoOrder> {
    return memberApiClient<TossDemoOrder>('/api/v1/user/billing/demo/orders', {
      method: 'POST',
      auth: true,
    });
  },

  confirm(body: TossDemoConfirmRequest): Promise<TossDemoConfirmResult> {
    return memberApiClient<TossDemoConfirmResult>('/api/v1/user/billing/demo/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    });
  },
};
