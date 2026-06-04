export const subscriptionQueryKeys = {
  all: ['subscription'] as const,
  products: () => [...subscriptionQueryKeys.all, 'products'] as const,
  mySubscriptions: () => [...subscriptionQueryKeys.all, 'my-subscriptions'] as const,
  usages: () => [...subscriptionQueryKeys.all, 'usages'] as const,
  entitlements: () => [...subscriptionQueryKeys.all, 'entitlements'] as const,
  paymentHistory: (period: string, page: number, size: number) =>
    [...subscriptionQueryKeys.all, 'payment-history', period, page, size] as const,
};
