import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

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

// ── Enum 상수 ──────────────────────────────────────────────────

export const NOTICE_CATEGORY = {
  NOTICE:      'NOTICE',
  UPDATE:      'UPDATE',
  EVENT:       'EVENT',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export const FAQ_CATEGORY = {
  ACCOUNT: 'ACCOUNT',
  PAYMENT: 'PAYMENT',
  SERVICE: 'SERVICE',
  ETC:     'ETC',
} as const;

export const INQUIRY_CATEGORY = {
  REFUND:        'REFUND',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  SERVICE:       'SERVICE',
  ACCOUNT:       'ACCOUNT',
  ETC:           'ETC',
} as const;

export const INQUIRY_STATUS = {
  PENDING:     'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
} as const;

export type NoticeCategory   = typeof NOTICE_CATEGORY[keyof typeof NOTICE_CATEGORY];
export type FaqCategory      = typeof FAQ_CATEGORY[keyof typeof FAQ_CATEGORY];
export type InquiryCategory  = typeof INQUIRY_CATEGORY[keyof typeof INQUIRY_CATEGORY];
export type InquiryStatus    = typeof INQUIRY_STATUS[keyof typeof INQUIRY_STATUS];

// ── 한글 매핑 상수 ─────────────────────────────────────────────

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  NOTICE:      '공지',
  UPDATE:      '업데이트',
  EVENT:       '이벤트',
  MAINTENANCE: '점검',
};

export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  ACCOUNT: '계정',
  PAYMENT: '결제',
  SERVICE: '서비스',
  ETC:     '기타',
};

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  REFUND:        '환불',
  PAYMENT_ERROR: '결제오류',
  SERVICE:       '서비스',
  ACCOUNT:       '계정',
  ETC:           '기타',
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING:     '접수 중',
  IN_PROGRESS: '답변 중',
  COMPLETED:   '완료',
};

// ── 도메인 타입 ────────────────────────────────────────────────

export interface CsSummary {
  noticeCount: number;
  faqCount: number;
  pendingCount: number;
  inProgressCount: number;
}

export interface NoticeItem {
  noticeId: number;
  category: NoticeCategory;
  title: string;
  isVisible: boolean;
  createdAt: string;
}

export interface NoticeDetail extends NoticeItem {
  content: string;
  updatedAt: string;
}

export interface NoticeListData extends PageMeta {
  items: NoticeItem[];
}

export interface FaqItem {
  faqId: number;
  category: FaqCategory;
  question: string;
  answer: string;
  createdAt: string;
}

export interface FaqListData extends PageMeta {
  items: FaqItem[];
}

export interface InquiryItem {
  inquiryId: number;
  memberName: string;
  category: InquiryCategory;
  title: string;
  inquiryStatus: InquiryStatus;
  createdAt: string;
}

export interface InquiryDetail extends InquiryItem {
  content: string;
  reply: string | null;
  repliedAt: string | null;
  completedAt: string | null;
}

export interface InquiryListData extends PageMeta {
  items: InquiryItem[];
}

// ── 쿼리 파라미터 타입 ─────────────────────────────────────────

export interface NoticeListParams {
  category?: NoticeCategory;
  visible?: boolean;
  page?: number;
  size?: number;
}

export interface FaqListParams {
  category?: FaqCategory;
  page?: number;
  size?: number;
}

export interface InquiryListParams {
  category?: InquiryCategory;
  status?: InquiryStatus;
  page?: number;
  size?: number;
}

// ── API 함수 ───────────────────────────────────────────────────

export const csApi = {
  // KPI 집계
  getSummary: () =>
    axiosInstance.get<ApiResponse<CsSummary>>('/api/admin/cs/summary'),

  // 공지사항
  getNotices: (params?: NoticeListParams) =>
    axiosInstance.get<ApiResponse<NoticeListData>>('/api/admin/notices', { params }),

  getNoticeDetail: (noticeId: number) =>
    axiosInstance.get<ApiResponse<NoticeDetail>>(`/api/admin/notices/${noticeId}`),

  createNotice: (body: { category: NoticeCategory; title: string; content: string; isVisible: boolean }) =>
    axiosInstance.post<ApiResponse<{ noticeId: number }>>('/api/admin/notices', body),

  updateNotice: (noticeId: number, body: { category: NoticeCategory; title: string; content: string; isVisible: boolean }) =>
    axiosInstance.put<ApiResponse<{ noticeId: number; updatedAt: string }>>(`/api/admin/notices/${noticeId}`, body),

  deleteNotice: (noticeId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/notices/${noticeId}`),

  // FAQ
  getFaqs: (params?: FaqListParams) =>
    axiosInstance.get<ApiResponse<FaqListData>>('/api/admin/faqs', { params }),

  createFaq: (body: { category: FaqCategory; question: string; answer: string }) =>
    axiosInstance.post<ApiResponse<{ faqId: number }>>('/api/admin/faqs', body),

  updateFaq: (faqId: number, body: { category: FaqCategory; question: string; answer: string }) =>
    axiosInstance.put<ApiResponse<{ faqId: number; updatedAt: string }>>(`/api/admin/faqs/${faqId}`, body),

  deleteFaq: (faqId: number) =>
    axiosInstance.delete<ApiResponse<null>>(`/api/admin/faqs/${faqId}`),

  // 1:1 문의
  getInquiries: (params?: InquiryListParams) =>
    axiosInstance.get<ApiResponse<InquiryListData>>('/api/admin/inquiries', { params }),

  getInquiryDetail: (inquiryId: number) =>
    axiosInstance.get<ApiResponse<InquiryDetail>>(`/api/admin/inquiries/${inquiryId}`),

  saveReply: (inquiryId: number, body: { reply: string }) =>
    axiosInstance.put<ApiResponse<{ inquiryId: number; inquiryStatus: InquiryStatus; repliedAt: string }>>(
      `/api/admin/inquiries/${inquiryId}/reply`, body
    ),

  completeInquiry: (inquiryId: number) =>
    axiosInstance.put<ApiResponse<{ inquiryId: number; inquiryStatus: InquiryStatus; completedAt: string }>>(
      `/api/admin/inquiries/${inquiryId}/complete`
    ),
};
