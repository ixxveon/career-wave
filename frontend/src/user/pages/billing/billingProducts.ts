// TODO(Phase 7): CheckoutPage에서 GET /api/v1/billing/products 응답으로 교체한다.
// 여기 정의된 가격은 서버 응답 이전의 표시용 fallback이며 결제 금액의 근거로 사용하지 않는다.
export type BillingProductKey = 'document-coaching' | 'interview';

export interface BillingProduct {
  id: BillingProductKey;
  name: string;
  price: number;
}

export const billingProducts: Record<BillingProductKey, BillingProduct> = {
  'document-coaching': {
    id: 'document-coaching',
    name: '서류 AI 코칭 플랜',
    price: 9900,
  },
  interview: {
    id: 'interview',
    name: 'AI 모의면접 스타터 플랜',
    price: 12900,
  },
};

export function getBillingProduct(productKey: string): BillingProduct {
  if (productKey === 'document-coaching' || productKey === 'interview') {
    return billingProducts[productKey];
  }

  return billingProducts['document-coaching'];
}

export function formatPrice(amount: number): string {
  return `₩${Number(amount).toLocaleString('ko-KR')}`;
}
