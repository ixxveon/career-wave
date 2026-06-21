import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

// ── Enum 상수 ──────────────────────────────────────────────────

export const PAY_STATUS = {
  PENDING:  'PENDING',
  DONE:     'DONE',
  CANCELED: 'CANCELED',
  FAILED:   'FAILED',
} as const;

export const REFUND_STATUS = {
  PENDING:   'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED:    'FAILED',
  REJECTED:  'REJECTED',
} as const;

export const PAYMENT_TYPE = {
  MANUAL:       'MANUAL',
  AUTO_RENEWAL: 'AUTO_RENEWAL',
} as const;

export const SUB_STATUS = {
  ACTIVE:            'ACTIVE',
  CANCEL_SCHEDULED:  'CANCEL_SCHEDULED',
  EXPIRED:           'EXPIRED',
  PAYMENT_FAILED:    'PAYMENT_FAILED',
  REFUND_PENDING:    'REFUND_PENDING',
  REFUNDED:          'REFUNDED',
} as const;

export type PayStatus    = typeof PAY_STATUS[keyof typeof PAY_STATUS];
export type RefundStatus = typeof REFUND_STATUS[keyof typeof REFUND_STATUS];
export type PaymentType  = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];
export type SubStatus    = typeof SUB_STATUS[keyof typeof SUB_STATUS];

// ── 한글 레이블 ────────────────────────────────────────────────

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  PENDING:  '결제 대기',
  DONE:     '결제 완료',
  CANCELED: '환불 완료',
  FAILED:   '결제 실패',
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  PENDING:   '환불 요청',
  COMPLETED: '환불 완료',
  FAILED:    '환불 실패',
  REJECTED:  '환불 불가',
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  MANUAL:       '직접 결제',
  AUTO_RENEWAL: '자동 갱신',
};

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  ACTIVE:            '활성',
  CANCEL_SCHEDULED:  '취소예정',
  EXPIRED:           '만료',
  PAYMENT_FAILED:    '결제실패',
  REFUND_PENDING:    '환불요청',
  REFUNDED:          '환불완료',
};

// ── 도메인 인터페이스 ──────────────────────────────────────────

export interface AiUsage {
  documentCount: number;
  interviewCount: number;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  memberName: string;
  planName: string;
  approvedAt: string;
  amount: number;
  paymentStatus: PayStatus;
  paymentMethod?: string;
  aiUsage: AiUsage;
  refundStatus?: RefundStatus;
}

export interface PaymentSummary {
  totalRevenue: number;
  paidCount: number;
  refundPendingCount: number;
  failedCount: number;
}

export interface Subscription {
  subscriptionId: string;
  memberName: string;
  planName: string;
  startedAt: string;
  currentPeriodEnd: string;
  subscriptionStatus: SubStatus;
  autoRenew: boolean;
}

// ── 쿼리 파라미터 타입 ─────────────────────────────────────────

export interface PaymentListParams {
  keyword?: string;
  status?: PayStatus;
  page?: number;
  size?: number;
}

export interface SubscriptionListParams {
  status?: SubStatus;
  page?: number;
  size?: number;
}

export interface SubscriptionCounts {
  active: number;
  renewalScheduled: number;
  cancelScheduled: number;
  atRisk: number;
}

// ── 환불 응답 타입 ─────────────────────────────────────────────

export interface RefundResult {
  paymentId: string;
  paymentStatus: PayStatus;
  refundStatus: RefundStatus;
}

// ── API 함수 ───────────────────────────────────────────────────

export const paymentApi = {
  // KPI 집계
  getSummary: () =>
    axiosInstance.get<ApiResponse<PaymentSummary>>('/api/v1/admin/payments/summary'),

  // 결제 목록 조회
  getPayments: (params?: PaymentListParams) =>
    axiosInstance.get<ApiResponse<PageResult<Payment>>>('/api/v1/admin/payments', { params }),

  // 결제 상세 조회
  getPaymentDetail: (paymentId: string) =>
    axiosInstance.get<ApiResponse<Payment>>(`/api/v1/admin/payments/${paymentId}`),

  // 환불 처리 확정
  confirmRefund: (paymentId: string) =>
    axiosInstance.post<ApiResponse<RefundResult>>(
      `/api/v1/admin/payments/${paymentId}/refund`
    ),

  // 환불 불가 처리
  rejectRefund: (paymentId: string) =>
    axiosInstance.post<ApiResponse<RefundResult>>(
      `/api/v1/admin/payments/${paymentId}/refund-reject`
    ),

  // 구독 KPI 집계
  getSubscriptionCounts: () =>
    axiosInstance.get<ApiResponse<SubscriptionCounts>>('/api/v1/admin/subscriptions/counts'),

  // 구독 현황 목록 조회
  getSubscriptions: (params?: SubscriptionListParams) =>
    axiosInstance.get<ApiResponse<PageResult<Subscription>>>('/api/v1/admin/subscriptions', { params }),
};
