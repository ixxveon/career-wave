import axiosInstance from '../../utils/axiosInstance';

// ── 타입 정의 ──────────────────────────────────────────────────

export type SettlementStatus = 'PENDING' | 'CONFIRMED';
export type SettlementItemType = 'PAYMENT' | 'REFUND';

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  PENDING: '대기',
  CONFIRMED: '확정',
};

export const SETTLEMENT_ITEM_TYPE_LABEL: Record<SettlementItemType, string> = {
  PAYMENT: '결제',
  REFUND: '환불',
};

export interface SettlementListItem {
  settlementId: number;
  periodStart: string;
  periodEnd: string;
  totalSalesAmount: number;
  totalRefundAmount: number;
  netSalesAmount: number;
  totalTransactionCount: number;
  settlementStatus: SettlementStatus;
  createdAt: string;
}

export interface SettlementItemDetail {
  settlementItemId: number;
  paymentId: string;
  orderId: string;
  memberName: string;
  planName: string;
  amount: number;
  itemType: SettlementItemType;
  paymentApprovedAt: string;
}

export interface SettlementDetail extends SettlementListItem {
  supplyAmount: number;
  vatAmount: number;
  paidCount: number;
  refundCount: number;
  settledAt: string | null;
  settledByName: string | null;
  note: string | null;
  items: SettlementItemDetail[];
}

export interface SettlementConfirmResult {
  settlementId: number;
  settlementStatus: SettlementStatus;
  settledAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SettlementListParams {
  status?: string;
  page?: number;
  size?: number;
}

// ── API 함수 ───────────────────────────────────────────────────

export const settlementApi = {
  getList: (params?: SettlementListParams) =>
    axiosInstance.get<ApiResponse<PageResult<SettlementListItem>>>('/api/v1/admin/settlements', { params }),

  getDetail: (settlementId: number) =>
    axiosInstance.get<ApiResponse<SettlementDetail>>(`/api/v1/admin/settlements/${settlementId}`),

  generate: (body: { periodStart: string; periodEnd: string }) =>
    axiosInstance.post<ApiResponse<SettlementListItem>>('/api/v1/admin/settlements/generate', body),

  confirm: (settlementId: number, body: { note?: string }) =>
    axiosInstance.patch<ApiResponse<SettlementConfirmResult>>(`/api/v1/admin/settlements/${settlementId}/confirm`, body),
};
