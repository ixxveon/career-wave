export const PRODUCT_CODE = {
  DOCUMENT_COACHING: 'document-coaching',
  INTERVIEW: 'interview',
} as const;

export type ProductCode = (typeof PRODUCT_CODE)[keyof typeof PRODUCT_CODE];

export const BILLING_CYCLE = {
  MONTHLY: 'MONTHLY',
} as const;

export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

export const PAYMENT_HISTORY_PERIOD = {
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  SIX_MONTHS: '6M',
  TWELVE_MONTHS: '12M',
} as const;

export type PaymentHistoryPeriod = (typeof PAYMENT_HISTORY_PERIOD)[keyof typeof PAYMENT_HISTORY_PERIOD];

export const SUBSCRIPTION_STATUS = {
  NONE: 'NONE',
  ACTIVE: 'ACTIVE',
  CANCEL_SCHEDULED: 'CANCEL_SCHEDULED',
  EXPIRED: 'EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const PAYMENT_STATUS = {
  READY: 'READY',
  AGREED: 'AGREED',
  REQUESTING: 'REQUESTING',
  REDIRECTING: 'REDIRECTING',
  CONFIRMING: 'CONFIRMING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_FAILURE_REASON = {
  USER_CANCELED: 'USER_CANCELED',
  CARD_DECLINED: 'CARD_DECLINED',
  TIMEOUT: 'TIMEOUT',
  DUPLICATE_ORDER: 'DUPLICATE_ORDER',
  CONFIRM_FAILED: 'CONFIRM_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  UNKNOWN: 'UNKNOWN',
} as const;

export type PaymentFailureReason = (typeof PAYMENT_FAILURE_REASON)[keyof typeof PAYMENT_FAILURE_REASON];

export interface Product {
  productCode: ProductCode;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  features: string[];
  active: boolean;
}

export interface Subscription {
  subscriptionId: string;
  productCode: ProductCode;
  productName: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingAt: string | null;
  cancelScheduledAt: string | null;
}

export interface UsageSummary {
  productCode: ProductCode;
  limit: number;
  used: number;
  remaining: number;
  unit: string;
  resetAt: string | null;
}

export type Entitlements = Record<ProductCode, boolean>;

export interface PaymentOrder {
  orderId: string;
  idempotencyKey: string;
  productCode: ProductCode;
  productName: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  customerName: string;
  customerEmail: string;
  expiresAt: string;
}

export interface PaymentHistory {
  paymentId: string;
  orderId: string;
  productCode: ProductCode;
  productName: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  failureReason: PaymentFailureReason | null;
}

export interface PaymentHistoryPageResponse {
  content: PaymentHistory[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaymentHistoryQuery {
  period: PaymentHistoryPeriod;
  page: number;
  size: number;
}

export interface PaymentFailure {
  reasonCode: PaymentFailureReason;
  displayMessage: string;
  retryable: boolean;
}

export interface CancelSubscriptionRequest {
  reason: string;
}

export interface CancelSubscriptionResponse {
  subscriptionId: string;
  productCode: ProductCode;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelScheduledAt: string;
}

export type UsageItem = {
  productCode: ProductCode;
  key: 'document' | 'interview';
  title: string;
  accent: 'document' | 'interview';
  isSubscribed: boolean;
  subscription: Subscription | null;
  usage: UsageSummary | null;
};
