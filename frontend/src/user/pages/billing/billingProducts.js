export const billingProducts = {
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

export function getBillingProduct(productKey) {
  return billingProducts[productKey] ?? billingProducts['document-coaching'];
}

export function formatPrice(amount) {
  return `₩${Number(amount).toLocaleString('ko-KR')}`;
}
