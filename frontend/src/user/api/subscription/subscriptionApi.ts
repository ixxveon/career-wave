import { memberApiClient } from '../member/memberApiClient';
import type {
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  Entitlements,
  Product,
  Subscription,
  UsageSummary,
} from '../../types/subscription';

export const subscriptionApi = {
  getProducts(): Promise<Product[]> {
    return memberApiClient<Product[]>('/api/v1/user/billing/products', { auth: true });
  },

  getMySubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    return memberApiClient<{ subscriptions: Subscription[] }>('/api/v1/user/subscriptions/me', { auth: true });
  },

  getUsages(): Promise<{ usages: UsageSummary[] }> {
    return memberApiClient<{ usages: UsageSummary[] }>('/api/v1/user/subscriptions/me/usages', { auth: true });
  },

  getEntitlements(): Promise<{ entitlements: Entitlements }> {
    return memberApiClient<{ entitlements: Entitlements }>('/api/v1/user/subscriptions/me/entitlements', { auth: true });
  },

  cancelSubscription(subscriptionId: string, payload: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> {
    return memberApiClient<CancelSubscriptionResponse>(`/api/v1/user/subscriptions/${subscriptionId}/cancel`, {
      auth: true,
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
