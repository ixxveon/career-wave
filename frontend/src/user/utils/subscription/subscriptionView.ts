import { PRODUCT_CODE, SUBSCRIPTION_STATUS, type ProductCode, type Subscription, type UsageSummary } from '../../types/subscription';

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

const ACTIVE_STATUSES = new Set<string>([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
  SUBSCRIPTION_STATUS.PAYMENT_FAILED,
]);

export type UsageItem = {
  productCode: ProductCode;
  key: 'document' | 'interview';
  title: string;
  accent: 'document' | 'interview';
  isSubscribed: boolean;
  subscription: Subscription | null;
  usage: UsageSummary | null;
};

export function formatBillingDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function buildUsageItems(
  subscriptions: Subscription[],
  usages: UsageSummary[],
): UsageItem[] {
  return ALL_PRODUCT_CODES.map((code) => {
    const subscription = subscriptions.find((s) => s.productCode === code) ?? null;
    const usage = usages.find((u) => u.productCode === code) ?? null;
    const isSubscribed = subscription !== null && ACTIVE_STATUSES.has(subscription.status);

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
