import { PAYMENT_STATUS, PRODUCT_CODE, SUBSCRIPTION_STATUS, type PaymentStatus, type ProductCode, type Subscription, type SubscriptionStatus, type UsageItem, type UsageSummary } from '../../../types/user/subscription';

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.PAID]: '결제 완료',
  [PAYMENT_STATUS.FAILED]: '결제 실패',
  [PAYMENT_STATUS.CANCELED]: '취소',
  [PAYMENT_STATUS.REFUNDED]: '환불',
  [PAYMENT_STATUS.READY]: '준비 중',
  [PAYMENT_STATUS.AGREED]: '동의 완료',
  [PAYMENT_STATUS.REQUESTING]: '요청 중',
  [PAYMENT_STATUS.REDIRECTING]: '이동 중',
  [PAYMENT_STATUS.CONFIRMING]: '승인 중',
};

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, 'success' | 'fail' | 'cancel' | 'neutral'> = {
  [PAYMENT_STATUS.PAID]: 'success',
  [PAYMENT_STATUS.FAILED]: 'fail',
  [PAYMENT_STATUS.CANCELED]: 'cancel',
  [PAYMENT_STATUS.REFUNDED]: 'cancel',
  [PAYMENT_STATUS.READY]: 'neutral',
  [PAYMENT_STATUS.AGREED]: 'neutral',
  [PAYMENT_STATUS.REQUESTING]: 'neutral',
  [PAYMENT_STATUS.REDIRECTING]: 'neutral',
  [PAYMENT_STATUS.CONFIRMING]: 'neutral',
};

export function formatPaymentStatus(status: PaymentStatus): { label: string; variant: 'success' | 'fail' | 'cancel' | 'neutral' } {
  return {
    label: PAYMENT_STATUS_LABEL[status] ?? status,
    variant: PAYMENT_STATUS_VARIANT[status] ?? 'neutral',
  };
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₩${Number(amount).toLocaleString('ko-KR')}`;
}

export const PRODUCT_ACCENT: Record<ProductCode, 'document' | 'interview'> = {
  [PRODUCT_CODE.DOCUMENT_COACHING]: 'document',
  [PRODUCT_CODE.INTERVIEW]: 'interview',
};

export const PRODUCT_TITLE: Record<ProductCode, string> = {
  [PRODUCT_CODE.DOCUMENT_COACHING]: '서류 AI 코칭',
  [PRODUCT_CODE.INTERVIEW]: 'AI 모의면접',
};

export const PRODUCT_RECOMMEND: Record<ProductCode, { description: string; button: string }> = {
  [PRODUCT_CODE.DOCUMENT_COACHING]: {
    description: '가이드와 피드백을 보면서 서류 완성도를 더 빠르게 끌어올릴 수 있어요.',
    button: '서류 AI 코칭 알아보기',
  },
  [PRODUCT_CODE.INTERVIEW]: {
    description: '실전처럼 면접을 연습하고 답변 분석 리포트를 받아볼 수 있어요.',
    button: 'AI 모의면접 알아보기',
  },
};

export const ALL_PRODUCT_CODES: ProductCode[] = [
  PRODUCT_CODE.DOCUMENT_COACHING,
  PRODUCT_CODE.INTERVIEW,
];

// 구매(신규 결제)를 차단해야 하는 구독 상태.
// 백엔드 UserCheckoutOrderServiceImpl 의 BLOCKING_STATUSES 와 반드시 일치해야 한다.
const ACTIVE_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
  SUBSCRIPTION_STATUS.PAYMENT_FAILED,
]);

export function isActiveSubscriptionStatus(status: SubscriptionStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

const USAGE_UNIT_LABELS: Record<string, string> = {
  analysis: '회',
  session: '회',
};

export function formatUsageUnit(unit: string | undefined): string {
  if (!unit) return '회';
  return USAGE_UNIT_LABELS[unit] ?? unit;
}

export function formatBillingDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function formatSubscriptionStatusLabel(item: UsageItem): string {
  if (item.subscription?.status === SUBSCRIPTION_STATUS.CANCEL_SCHEDULED) {
    const endDate = formatBillingDate(item.subscription.currentPeriodEnd);
    return `${item.title} 해지 예정 (${endDate}까지 이용 가능)`;
  }
  return `${item.title} 구독중`;
}

export function buildRecommendationItem(productCode: ProductCode): UsageItem {
  return {
    productCode,
    key: PRODUCT_ACCENT[productCode],
    title: PRODUCT_TITLE[productCode],
    accent: PRODUCT_ACCENT[productCode],
    isSubscribed: false,
    subscription: null,
    usage: null,
  };
}

export function buildUsageItems(
  subscriptions: Subscription[],
  usages: UsageSummary[],
): UsageItem[] {
  return ALL_PRODUCT_CODES.map((code) => {
    const productSubs = subscriptions.filter((s) => s.productCode === code);
    const subscription =
      productSubs.find((s) => isActiveSubscriptionStatus(s.status)) ??
      productSubs[productSubs.length - 1] ??
      null;
    const usage = usages.find((u) => u.productCode === code) ?? null;
    const isSubscribed = subscription !== null && isActiveSubscriptionStatus(subscription.status);

    return {
      productCode: code,
      key: PRODUCT_ACCENT[code],
      title: PRODUCT_TITLE[code],
      accent: PRODUCT_ACCENT[code],
      isSubscribed,
      subscription,
      usage,
    };
  });
}
