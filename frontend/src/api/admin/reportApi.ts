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
  contentBody: string | null;
  aiSuggestion: AiSuggestion | null;
  processedAt: string | null;
  processedBy: number | null;
  memberId: string;
}

interface RawReportDetail extends Omit<ReportDetail, 'aiSuggestion'> {
  aiSuggestion: string | null;
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

export interface MemberAiReview {
  reportCount: number;
  warningCount: number;
  riskLevel: '높음' | '중간' | '낮음';
  recommendation: 'NONE' | 'WARNING' | 'SUSPEND' | 'BLACKLIST';
  summary: string;
}

export interface ContentDeleteResult {
  reportId: number;
  targetType: TargetType;
  targetId: number;
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
  getReportDetail: async (reportId: number): Promise<{ data: ApiResponse<ReportDetail> }> => {
    const res = await axiosInstance.get<ApiResponse<RawReportDetail>>(`/api/v1/admin/reports/${reportId}`);
    const raw = res.data.data;
    if (!raw) {
      return { data: { ...res.data, data: null as unknown as ReportDetail } };
    }
    const aiSuggestion: AiSuggestion | null = typeof raw.aiSuggestion === 'string'
      ? (() => { try { return JSON.parse(raw.aiSuggestion as string); } catch { return null; } })()
      : null;
    return { data: { ...res.data, data: { ...raw, aiSuggestion } } };
  },

  // 블라인드 처리
  blindReport: (reportId: number) =>
    axiosInstance.patch<ApiResponse<ReportActionResult>>(`/api/v1/admin/reports/${reportId}/blind`),

  // 기각 처리
  dismissReport: (reportId: number) =>
    axiosInstance.patch<ApiResponse<ReportActionResult>>(`/api/v1/admin/reports/${reportId}/dismiss`),

  // 대상 회원 AI 검토
  requestMemberAnalysis: (reportId: number) =>
    axiosInstance.post<ApiResponse<MemberAiReview>>(`/api/v1/admin/reports/${reportId}/member-analysis`),

  // 신고 대상 게시글·댓글 삭제(블라인드) — 신고 처리 상태와 무관하게 항상 가능
  deleteContent: (reportId: number) =>
    axiosInstance.delete<ApiResponse<ContentDeleteResult>>(`/api/v1/admin/reports/${reportId}/content`),
};
