# Tasks: 고객센터 관리 (Customer Service)

> `plan.md`의 Phase와 1:1 대응한다.
> v1 완료 항목은 ✅ 표시, 예정 항목은 [ ] 표시한다.

---

## Phase 1 — 공통 구조

### TypeScript 인터페이스 정의

```ts
// frontend/src/admin/api/csApi.ts 상단에 선언

type NoticeCategory = 'NOTICE' | 'UPDATE' | 'EVENT' | 'MAINTENANCE';
type FaqCategory    = 'ACCOUNT' | 'PAYMENT' | 'SERVICE' | 'ETC';
type InquiryCategory = 'REFUND' | 'PAYMENT_ERROR' | 'SERVICE' | 'ACCOUNT' | 'ETC';
type InquiryStatus  = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

interface CsSummary {
  noticeCount: number;
  faqCount: number;
  pendingCount: number;
  inProgressCount: number;
}

interface Notice {
  noticeId: number;
  category: NoticeCategory;
  title: string;
  content: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Faq {
  faqId: number;
  category: FaqCategory;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

interface Inquiry {
  inquiryId: number;
  memberName: string;
  category: InquiryCategory;
  title: string;
  content: string;
  reply: string | null;
  inquiryStatus: InquiryStatus;
  createdAt: string;
  repliedAt: string | null;
  completedAt: string | null;
}

interface PageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

### 더미 데이터 파일

```ts
// frontend/src/admin/data/csData.ts

export const dummyCsSummary: CsSummary = {
  noticeCount: 12,
  faqCount: 28,
  pendingCount: 5,
  inProgressCount: 3,
};

export const dummyNotices: Notice[] = [
  {
    noticeId: 1,
    category: 'NOTICE',
    title: '서비스 이용 안내',
    content: '서비스를 이용해 주셔서 감사합니다.',
    isVisible: true,
    createdAt: '2025-05-01T09:00:00Z',
    updatedAt: '2025-05-01T09:00:00Z',
  },
  // ...
];

export const dummyFaqs: Faq[] = [
  {
    faqId: 1,
    category: 'PAYMENT',
    question: '결제 수단을 변경하려면 어떻게 하나요?',
    answer: '마이페이지 > 결제 정보에서 변경하실 수 있습니다.',
    createdAt: '2025-04-10T10:00:00Z',
    updatedAt: '2025-04-10T10:00:00Z',
  },
  // ...
];

export const dummyInquiries: Inquiry[] = [
  {
    inquiryId: 1,
    memberName: '홍길동',
    category: 'REFUND',
    title: '환불 요청합니다.',
    content: '결제 후 서비스를 이용하지 못했습니다.',
    reply: null,
    inquiryStatus: 'PENDING',
    createdAt: '2025-05-20T14:30:00Z',
    repliedAt: null,
    completedAt: null,
  },
  // ...
];
```

### 한글 매핑 상수

```ts
// frontend/src/admin/data/csData.ts

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
```

- [ ] `CustomerServicePage.tsx` 파일 생성 (탭 상태 관리 포함)
- [ ] KPI 카드 4종 렌더링 (공지 수 / FAQ 수 / 미답변 수 / 답변 중 수)
- [ ] 3-탭 헤더 (공지사항 / FAQ / 1:1 문의) 구성
- [ ] `csData.ts` 더미 데이터 파일 생성

---

## Phase 2 — 공지사항 탭

- [ ] `NoticeTab.tsx` 컴포넌트 생성
- [ ] 카테고리 필터 드롭다운 (전체 / NOTICE / UPDATE / EVENT / MAINTENANCE)
- [ ] 노출 여부 필터 드롭다운 (전체 / 노출 / 미노출)
- [ ] "+ 공지 등록" 버튼 → `NoticeFormModal` 열기
- [ ] 공지 목록 테이블 (번호 / 카테고리 / 제목 / 등록일 / 노출 여부 / 관리)
- [ ] 카테고리 배지 렌더링 (`NOTICE_CATEGORY_LABEL` 활용)
- [ ] 노출 여부 토글 배지 (노출 / 미노출)
- [ ] 관리 컬럼 "수정" / "삭제" 버튼
- [ ] `NoticeFormModal.tsx` — 등록/수정 겸용 모달
  - [ ] 카테고리 셀렉트 (4종)
  - [ ] 제목 입력 (필수)
  - [ ] 내용 텍스트에어리어
  - [ ] 노출 여부 토글
  - [ ] "AI 초안 생성" 버튼 자리 (P2 — 버튼만 렌더링, 클릭 시 준비 중 토스트)
  - [ ] 저장 / 닫기 버튼
  - [ ] 제목 미입력 시 저장 버튼 비활성화
- [ ] 삭제 확인 모달 (확인 모달 없이 즉시 삭제 금지)

---

## Phase 3 — FAQ 탭

- [ ] `FaqTab.tsx` 컴포넌트 생성
- [ ] 카테고리 필터 드롭다운 (전체 / ACCOUNT / PAYMENT / SERVICE / ETC)
- [ ] "+ FAQ 등록" 버튼 → `FaqFormModal` 열기
- [ ] FAQ 목록 테이블 (번호 / 카테고리 / 질문 / 등록일 / 관리)
- [ ] 카테고리 배지 렌더링 (`FAQ_CATEGORY_LABEL` 활용)
- [ ] 관리 컬럼 "수정" / "삭제" 버튼
- [ ] `FaqFormModal.tsx` — 등록/수정 겸용 모달
  - [ ] 카테고리 셀렉트 (4종)
  - [ ] 질문 입력 (필수)
  - [ ] 답변 텍스트에어리어
  - [ ] "AI 답변 초안" 버튼 자리 (P2 — 버튼만 렌더링, 클릭 시 준비 중 토스트)
  - [ ] 저장 / 닫기 버튼
  - [ ] 질문 미입력 시 저장 버튼 비활성화

---

## Phase 4 — 1:1 문의 탭

- [ ] `InquiryTab.tsx` 컴포넌트 생성
- [ ] 카테고리 필터 드롭다운 (전체 / REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC)
- [ ] 상태 필터 드롭다운 (전체 / PENDING / IN_PROGRESS / COMPLETED)
- [ ] 문의 목록 테이블 (문의ID / 회원명 / 카테고리 / 제목 / 접수일 / 상태 / 관리)
- [ ] 상태 배지 렌더링 (`INQUIRY_STATUS_LABEL` 활용)
  - `PENDING` → 강조 배지 (미답변 강조)
  - `IN_PROGRESS` → 중간 배지
  - `COMPLETED` → 완료 배지
- [ ] 카테고리 배지 렌더링 (`INQUIRY_CATEGORY_LABEL` 활용)
- [ ] 관리 컬럼 "상세보기" 버튼
- [ ] `InquiryDetailModal.tsx`
  - [ ] 문의 정보 영역 (카테고리 / 상태 / 제목 / 내용 / 접수일)
  - [ ] 기존 답변 있으면 답변 입력창에 미리 채움
  - [ ] 답변 입력 텍스트에어리어 (`COMPLETED` 시 disabled)
  - [ ] "AI 답변 초안" 버튼 (P2, `COMPLETED` 시 미노출)
  - [ ] "답변 저장" 버튼 (`COMPLETED` 시 미노출)
  - [ ] "처리 완료" 버튼 (`IN_PROGRESS` 시만 노출)
  - [ ] 모달 닫기 버튼 / 외부 클릭 닫기

---

## Phase 5 — API 연동

### csApi.ts 작성

```ts
// frontend/src/admin/api/csApi.ts
import axiosInstance from '@/utils/axiosInstance';

// KPI
export const fetchCsSummary = () =>
  axiosInstance.get('/api/admin/cs/summary').then(r => r.data);

// 공지사항
export const fetchNotices = (params: { category?: string; visible?: boolean; page: number; size: number }) =>
  axiosInstance.get('/api/admin/notices', { params }).then(r => r.data);

export const createNotice = (body: { category: string; title: string; content: string; isVisible: boolean }) =>
  axiosInstance.post('/api/admin/notices', body).then(r => r.data);

export const updateNotice = (noticeId: number, body: { category: string; title: string; content: string; isVisible: boolean }) =>
  axiosInstance.put(`/api/admin/notices/${noticeId}`, body).then(r => r.data);

export const deleteNotice = (noticeId: number) =>
  axiosInstance.delete(`/api/admin/notices/${noticeId}`).then(r => r.data);

// FAQ
export const fetchFaqs = (params: { category?: string; page: number; size: number }) =>
  axiosInstance.get('/api/admin/faqs', { params }).then(r => r.data);

export const createFaq = (body: { category: string; question: string; answer: string }) =>
  axiosInstance.post('/api/admin/faqs', body).then(r => r.data);

export const updateFaq = (faqId: number, body: { category: string; question: string; answer: string }) =>
  axiosInstance.put(`/api/admin/faqs/${faqId}`, body).then(r => r.data);

export const deleteFaq = (faqId: number) =>
  axiosInstance.delete(`/api/admin/faqs/${faqId}`).then(r => r.data);

// 문의
export const fetchInquiries = (params: { category?: string; status?: string; page: number; size: number }) =>
  axiosInstance.get('/api/admin/inquiries', { params }).then(r => r.data);

export const fetchInquiryDetail = (inquiryId: number) =>
  axiosInstance.get(`/api/admin/inquiries/${inquiryId}`).then(r => r.data);

export const saveInquiryReply = (inquiryId: number, body: { reply: string }) =>
  axiosInstance.put(`/api/admin/inquiries/${inquiryId}/reply`, body).then(r => r.data);

export const completeInquiry = (inquiryId: number) =>
  axiosInstance.put(`/api/admin/inquiries/${inquiryId}/complete`).then(r => r.data);

// AI 초안 (P2)
export const generateNoticeDraft = (body: { category: string; title: string }) =>
  axiosInstance.post('/api/admin/ai/notice-draft', body).then(r => r.data);

export const generateFaqDraft = (body: { question: string }) =>
  axiosInstance.post('/api/admin/ai/faq-draft', body).then(r => r.data);

export const generateInquiryDraft = (body: { category: string; title: string; content: string }) =>
  axiosInstance.post('/api/admin/ai/inquiry-draft', body).then(r => r.data);
```

- [ ] `csApi.ts` 파일 작성
- [ ] KPI 집계 API 연동 및 더미 데이터 제거 (`GET /api/admin/cs/summary`)
- [ ] 공지사항 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/notices`)
- [ ] 공지사항 카테고리·노출 여부 필터 쿼리 파라미터 연결
- [ ] 공지사항 페이지네이션 연결 (page, size)
- [ ] 공지사항 등록 API 연동 (`POST /api/admin/notices`)
- [ ] 공지사항 수정 API 연동 (`PUT /api/admin/notices/{noticeId}`)
- [ ] 공지사항 삭제 API 연동 (`DELETE /api/admin/notices/{noticeId}`)
- [ ] FAQ 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/faqs`)
- [ ] FAQ 카테고리 필터 쿼리 파라미터 연결
- [ ] FAQ 페이지네이션 연결 (page, size)
- [ ] FAQ 등록 API 연동 (`POST /api/admin/faqs`)
- [ ] FAQ 수정 API 연동 (`PUT /api/admin/faqs/{faqId}`)
- [ ] FAQ 삭제 API 연동 (`DELETE /api/admin/faqs/{faqId}`)
- [ ] 문의 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/inquiries`)
- [ ] 문의 카테고리·상태 필터 쿼리 파라미터 연결
- [ ] 문의 페이지네이션 연결 (page, size)
- [ ] 문의 상세 API 연동 (`GET /api/admin/inquiries/{inquiryId}`)
- [ ] 답변 저장 API 연동 (`PUT /api/admin/inquiries/{inquiryId}/reply`)
- [ ] 처리 완료 API 연동 (`PUT /api/admin/inquiries/{inquiryId}/complete`)
- [ ] 답변 저장 성공 후 상태 배지 즉시 갱신 (서버 응답 `inquiryStatus` 기준)
- [ ] API 실패 시 에러 메시지 표시 (`ApiResponse.message` 활용)
- [ ] 서버 409 응답 (INQUIRY_ALREADY_COMPLETED) 처리

---

## Phase 6 — AI 초안 (P2)

- [ ] 공지 등록 모달 "AI 초안 생성" 버튼 → `POST /api/admin/ai/notice-draft` 연동
  - 입력: `category`, `title`
  - 응답: `draft` → 내용 텍스트에어리어 자동 입력
  - 제목 미입력 시 버튼 비활성화
  - 로딩 중 버튼 비활성화 + 스피너 표시
- [ ] FAQ 등록 모달 "AI 답변 초안" 버튼 → `POST /api/admin/ai/faq-draft` 연동
  - 입력: `question`
  - 응답: `draft` → 답변 텍스트에어리어 자동 입력
  - 질문 미입력 시 버튼 비활성화
- [ ] 문의 상세 모달 "AI 답변 초안" 버튼 → `POST /api/admin/ai/inquiry-draft` 연동
  - 입력: `category`, `title`, `content`
  - 응답: `draft` → 답변 입력창 자동 입력
  - `COMPLETED` 상태 문의에서 버튼 미노출
- [ ] AI 초안 자동 저장 금지 (관리자 직접 수정·저장 필수)
- [ ] AI 서버 오류 (503) 시 에러 토스트 표시
