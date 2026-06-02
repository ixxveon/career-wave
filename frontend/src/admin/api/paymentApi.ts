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
  RENEWAL_SCHEDULED: 'RENEWAL_SCHEDULED',
  CANCEL_SCHEDULED:  'CANCEL_SCHEDULED',
  AT_RISK:           'AT_RISK',
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
  RENEWAL_SCHEDULED: '갱신예정',
  CANCEL_SCHEDULED:  '취소예정',
  AT_RISK:           '이탈위험',
};

// ── 도메인 인터페이스 ──────────────────────────────────────────

export interface AiUsage {
  resumePaidCount: number;
  interviewPaidCount: number;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  memberName: string;
  product: string;
  paidAt: string;          // ISO 8601
  amount: number;
  paymentStatus: PayStatus;
  paymentType: PaymentType;
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
  plan: string;
  startDate: string;
  renewDate: string;
  subStatus: SubStatus;
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
    axiosInstance.post<ApiResponse<{ paymentId: string; paymentStatus: PayStatus; refundStatus: RefundStatus }>>(
      `/api/v1/admin/payments/${paymentId}/refund`
    ),

  // 환불 불가 처리
  rejectRefund: (paymentId: string) =>
    axiosInstance.post<ApiResponse<{ paymentId: string; paymentStatus: PayStatus; refundStatus: RefundStatus }>>(
      `/api/v1/admin/payments/${paymentId}/refund-reject`
    ),

  // 구독 현황 목록 조회
  getSubscriptions: (params?: SubscriptionListParams) =>
    axiosInstance.get<ApiResponse<PageResult<Subscription>>>('/api/v1/admin/subscriptions', { params }),
};
