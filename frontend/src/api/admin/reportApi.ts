import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

export const REPORT_STATUS = { PENDING: 'PENDING', BLINDED: 'BLINDED', DISMISSED: 'DISMISSED' } as const;
export const TARGET_TYPE = { BOARD: 'BOARD', COMMENT: 'COMMENT', MEMBER: 'MEMBER' } as const;
export const REPORT_REASON = { SPAM: 'SPAM', ABUSE: 'ABUSE', AD: 'AD', INAPPROPRIATE: 'INAPPROPRIATE', OTHER: 'OTHER' } as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];
export type TargetType = typeof TARGET_TYPE[keyof typeof TARGET_TYPE];
export type ReportReason = typeof REPORT_REASON[keyof typeof REPORT_REASON];

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

// ── 신고관리 타입 ──────────────────────────────────────────────

export interface ReportSummary {
  totalCount: number;
  pendingCount: number;
  blindedCount: number;
  highRiskCount: number;
}

export interface ReportItem {
  reportId: number;
  targetType: TargetType;
  reason: ReportReason;
  reportStatus: ReportStatus;
  reporterName: string;
  reportedName: string;
  contentTitle: string | null;
  createdAt: string;
}

export interface ReportListData extends PageMeta {
  items: ReportItem[];
}

export interface AiSuggestion {
  severity: '높음' | '중간' | '낮음';
  category: 'SPAM' | 'ABUSE' | 'AD' | 'INAPPROPRIATE' | 'OTHER';
  suggestion: string;
}

export interface ReportDetail extends ReportItem {
  targetId: number;
  contentTitle: string | null;
  contentBody: string | null;
  aiSuggestion: AiSuggestion | null;
  processedAt: string | null;
  processedBy: number | null;
}

export interface ReportListParams {
  status?: ReportStatus;
  targetType?: TargetType;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface ReportActionResult {
  reportId: number;
  reportStatus: ReportStatus;
  processedAt: string;
}

// ── API 함수 ───────────────────────────────────────────────────

export const reportApi = {
  // KPI 집계 조회
  getSummary: () =>
    axiosInstance.get<ApiResponse<ReportSummary>>('/api/v1/admin/reports/summary'),

  // 신고 목록 조회
  getReports: (params?: ReportListParams) =>
    axiosInstance.get<ApiResponse<ReportListData>>('/api/v1/admin/reports', { params }),

  // 신고 상세 조회
  getReportDetail: (reportId: number) =>
    axiosInstance.get<ApiResponse<ReportDetail>>(`/api/v1/admin/reports/${reportId}`),

  // 블라인드 처리
  blindReport: (reportId: number) =>
    axiosInstance.patch<ApiResponse<ReportActionResult>>(`/api/v1/admin/reports/${reportId}/blind`),

  // 기각 처리
  dismissReport: (reportId: number) =>
    axiosInstance.patch<ApiResponse<ReportActionResult>>(`/api/v1/admin/reports/${reportId}/dismiss`),
};
