import { memberApiClient } from '../member/memberApiClient';
import type { Entitlements, Product, Subscription, UsageSummary } from '../../types/subscription';

export const subscriptionApi = {
  getProducts(): Promise<Product[]> {
    return memberApiClient<Product[]>('/api/v1/billing/products', { auth: true });
  },

  getMySubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    return memberApiClient<{ subscriptions: Subscription[] }>('/api/v1/subscriptions/me', { auth: true });
  },

  getUsages(): Promise<{ usages: UsageSummary[] }> {
    return memberApiClient<{ usages: UsageSummary[] }>('/api/v1/subscriptions/me/usages', { auth: true });
  },

  getEntitlements(): Promise<{ entitlements: Entitlements }> {
    return memberApiClient<{ entitlements: Entitlements }>('/api/v1/subscriptions/me/entitlements', { auth: true });
  },
};
