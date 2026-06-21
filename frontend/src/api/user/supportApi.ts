import { memberApiClient } from './member/memberApiClient';

// ── Enum ───────────────────────────────────────────────────────

export const NOTICE_CATEGORY = {
  NOTICE: 'NOTICE',
  UPDATE: 'UPDATE',
  EVENT: 'EVENT',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export const FAQ_CATEGORY = {
  ACCOUNT: 'ACCOUNT',
  PAYMENT: 'PAYMENT',
  SERVICE: 'SERVICE',
  ETC: 'ETC',
} as const;

export const INQUIRY_CATEGORY = {
  REFUND: 'REFUND',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  SERVICE: 'SERVICE',
  ACCOUNT: 'ACCOUNT',
  ETC: 'ETC',
} as const;

export const INQUIRY_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type NoticeCategory = typeof NOTICE_CATEGORY[keyof typeof NOTICE_CATEGORY];
export type FaqCategory    = typeof FAQ_CATEGORY[keyof typeof FAQ_CATEGORY];
export type InquiryCategory = typeof INQUIRY_CATEGORY[keyof typeof INQUIRY_CATEGORY];
export type InquiryStatus  = typeof INQUIRY_STATUS[keyof typeof INQUIRY_STATUS];

// ── 한글 레이블 ────────────────────────────────────────────────

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  NOTICE: '공지', UPDATE: '업데이트', EVENT: '이벤트', MAINTENANCE: '점검',
};

export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  ACCOUNT: '계정', PAYMENT: '구독/결제', SERVICE: 'AI 서비스', ETC: '기타',
};

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  REFUND: '환불', PAYMENT_ERROR: '구독/결제', SERVICE: 'AI 서비스', ACCOUNT: '계정', ETC: '기타',
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING: '접수', IN_PROGRESS: '처리 중', COMPLETED: '답변 완료',
};

// ── 타입 ───────────────────────────────────────────────────────

export interface NoticeItem {
  noticeId: number;
  title: string;
  category: NoticeCategory;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
}

export interface NoticeDetail extends NoticeItem {
  content: string;
  prevNotice: { noticeId: number; title: string } | null;
  nextNotice: { noticeId: number; title: string } | null;
}

export interface NoticeListResult {
  items: NoticeItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface FaqItem {
  faqId: number;
  category: FaqCategory;
  question: string;
  answer: string;
}

export interface InquiryItem {
  inquiryId: number;
  category: InquiryCategory;
  title: string;
  contentPreview: string;
  reply: string | null;
  inquiryStatus: InquiryStatus;
  createdAt: string;
}

export interface CreateInquiryRequest {
  category: InquiryCategory;
  title: string;
  content: string;
}

export interface CreateInquiryResult {
  inquiryId: number;
  inquiryStatus: 'PENDING';
}

// ── 계정 상태 타입 ─────────────────────────────────────────────

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'LOCKED' | 'WITHDRAWN' | 'BLACKLISTED';
export type RestrictionType = 'SUSPENDED' | 'BANNED' | 'LOCKED' | 'WITHDRAWN';
export type SanctionDuration = 'THREE_DAYS' | 'SEVEN_DAYS' | 'FOURTEEN_DAYS' | 'THIRTY_DAYS' | 'PERMANENT';

export interface AccountRestriction {
  restrictionType: RestrictionType;
  recoverable: boolean;
  availableAt: string | null;
  messageCode: string;
  reason: string | null;
  startedAt: string | null;
  duration: SanctionDuration | null;
}

export interface AccountStatus {
  memberStatus: MemberStatus;
  restriction: AccountRestriction | null;
}

// ── API 함수 ───────────────────────────────────────────────────

export const supportApi = {
  // 공지사항 목록
  getNotices: (params: { category?: NoticeCategory; keyword?: string; page: number; size: number }) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.keyword)  query.set('keyword', params.keyword);
    query.set('page', String(params.page));
    query.set('size', String(params.size));
    return memberApiClient<NoticeListResult>(`/api/v1/user/notices?${query}`);
  },

  // 공지사항 상세
  getNoticeDetail: (noticeId: number) =>
    memberApiClient<NoticeDetail>(`/api/v1/user/notices/${noticeId}`),

  // FAQ 목록
  getFaqs: (params?: { category?: FaqCategory; keyword?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.keyword)  query.set('keyword', params.keyword);
    const qs = query.toString();
    return memberApiClient<FaqItem[]>(`/api/v1/user/faqs${qs ? `?${qs}` : ''}`);
  },

  // 나의 문의 목록 (로그인 필수)
  getMyInquiries: (params?: { category?: InquiryCategory }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    return memberApiClient<InquiryItem[]>(`/api/v1/user/inquiries${qs ? `?${qs}` : ''}`, { auth: true });
  },

  // 문의 접수 (로그인 필수)
  createInquiry: (body: CreateInquiryRequest) =>
    memberApiClient<CreateInquiryResult>('/api/v1/user/inquiries', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  // 계정 상태 조회 (로그인 필수)
  getAccountStatus: () =>
    memberApiClient<AccountStatus>('/api/v1/user/members/me/status', { auth: true }),
};
