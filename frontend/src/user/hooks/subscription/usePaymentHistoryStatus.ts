import { useEffect, useMemo, useState } from 'react';
import {
  CANCEL_REASON,
  SUBSCRIPTION_STATUS,
  type PaymentHistory,
  type PaymentHistoryPeriod,
  type PaymentHistorySubscriptionCardItem,
  type SubscriptionStatus,
  type UsageItem,
} from '../../types/subscription';
import {
  useCancelSubscription,
  useMySubscriptions,
  usePaymentHistory,
  useProducts,
} from './index';
import {
  ALL_PRODUCT_CODES,
  buildRecommendationItem,
  formatBillingDate,
  formatPrice,
} from '../../utils/subscription/subscriptionView';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
  SUBSCRIPTION_STATUS.PAYMENT_FAILED,
]);

const PAGE_SIZE = 5;

type UsePaymentHistoryStatusReturn = {
  periodFilter: PaymentHistoryPeriod;
  page: number;
  cancelTarget: PaymentHistorySubscriptionCardItem | null;
  successMessage: string;
  activeSubscriptions: PaymentHistorySubscriptionCardItem[];
  recommendationItems: UsageItem[];
  payments: PaymentHistory[];
  totalPages: number;
  noSubscriptions: boolean;
  singleRecommendation: UsageItem | null;
  isSubscriptionsLoading: boolean;
  isSubscriptionsError: boolean;
  isPaymentHistoryLoading: boolean;
  isPaymentHistoryError: boolean;
  isCanceling: boolean;
  setPeriodFilter: (period: PaymentHistoryPeriod) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setCancelTarget: (target: PaymentHistorySubscriptionCardItem | null) => void;
  handleCancelConfirm: () => Promise<void>;
};

export function usePaymentHistoryStatus(
  initialPeriod: PaymentHistoryPeriod,
): UsePaymentHistoryStatusReturn {
  const [periodFilter, setPeriodFilter] = useState<PaymentHistoryPeriod>(initialPeriod);
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<PaymentHistorySubscriptionCardItem | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    data: subscriptions = [],
    isLoading: isSubscriptionsLoading,
    isError: isSubscriptionsError,
  } = useMySubscriptions();
  const { data: products = [] } = useProducts();
  const {
    data: paymentHistoryPage,
    isLoading: isPaymentHistoryLoading,
    isError: isPaymentHistoryError,
  } = usePaymentHistory({ period: periodFilter, page: page - 1, size: PAGE_SIZE });
  const cancelSubscription = useCancelSubscription();

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.productCode, p])),
    [products],
  );

  const activeSubscriptions = useMemo<PaymentHistorySubscriptionCardItem[]>(() => {
    return subscriptions
      .filter((s) => ACTIVE_SUBSCRIPTION_STATUSES.has(s.status))
      .map((s) => {
        const product = productMap.get(s.productCode);
        return {
          subscriptionId: s.subscriptionId,
          productCode: s.productCode,
          name: s.productName,
          cancelScheduled: s.status === SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
          paymentFailed: s.status === SUBSCRIPTION_STATUS.PAYMENT_FAILED,
          nextBillingDate: formatBillingDate(s.nextBillingAt),
          billingCycle: '매월 정기 결제',
          monthlyPrice: formatPrice(product?.price),
          startedAt: s.startedAt,
          currentPeriodEnd: s.currentPeriodEnd,
        };
      });
  }, [productMap, subscriptions]);

  const recommendationItems = useMemo<UsageItem[]>(() => {
    const activeCodes = new Set(activeSubscriptions.map((s) => s.productCode));
    return ALL_PRODUCT_CODES
      .filter((code) => !activeCodes.has(code))
      .map((code) => buildRecommendationItem(code));
  }, [activeSubscriptions]);

  const payments = paymentHistoryPage?.content ?? [];
  const totalPages = Math.max(1, paymentHistoryPage?.totalPages ?? 1);
  const noSubscriptions = activeSubscriptions.length === 0;
  const singleRecommendation = recommendationItems[0] ?? null;

  useEffect(() => {
    if (page <= totalPages) return;
    setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function handleCancelConfirm() {
    if (!cancelTarget || cancelSubscription.isPending) return;
    try {
      await cancelSubscription.mutateAsync({
        subscriptionId: cancelTarget.subscriptionId,
        payload: { reason: CANCEL_REASON.NO_LONGER_NEEDED },
      });
      setSuccessMessage('구독 해지 신청이 완료되었습니다.');
      setCancelTarget(null);
    } catch {
      setSuccessMessage('');
    }
  }

  return {
    periodFilter,
    page,
    cancelTarget,
    successMessage,
    activeSubscriptions,
    recommendationItems,
    payments,
    totalPages,
    noSubscriptions,
    singleRecommendation,
    isSubscriptionsLoading,
    isSubscriptionsError,
    isPaymentHistoryLoading,
    isPaymentHistoryError,
    isCanceling: cancelSubscription.isPending,
    setPeriodFilter,
    setPage,
    setCancelTarget,
    handleCancelConfirm,
  };
}
