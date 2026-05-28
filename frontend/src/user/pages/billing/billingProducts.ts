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
    price: 29000,
  },
  interview: {
    id: 'interview',
    name: 'AI 모의면접 스타터 플랜',
    price: 29000,
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
