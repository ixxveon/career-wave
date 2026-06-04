# Tasks: 사용자 고객센터 (User Support)

> `plan.md`의 Phase와 1:1 대응한다.
> UI 구현 완료 항목은 ✅, API 연동 예정 항목은 [ ] 표시.

---

## Phase 1~6 — UI 구현 ✅ 완료

### 현재 구현 현황

| 파일 | 라인 수 | 상태 |
|---|---|---|
| `SupportPage.tsx` | 49줄 | ✅ 완료 |
| `NoticePage.tsx` | 99줄 | ✅ 완료 (이벤트 카테고리 미포함) |
| `NoticeDetailPage.tsx` | 158줄 | ✅ 완료 |
| `FaqPage.tsx` | 136줄 | ✅ 완료 (채용공고 카테고리 포함) |
| `InquiryListPage.tsx` | 197줄 | ✅ 완료 (환불 카테고리 미포함) |
| `InquiryCreatePage.tsx` | 122줄 | ✅ 완료 (환불 카테고리 미포함) |

### API 연동 전 수정 필요 사항

```ts
// 1. NoticePage.tsx — 카테고리 추가
const CATEGORIES = ['전체', '공지', '업데이트', '이벤트', '점검'];
//                                               ^^^ 추가 필요

// 2. InquiryListPage.tsx, InquiryCreatePage.tsx — 환불 카테고리 추가
const CATEGORIES = ['전체', '환불', 'AI 이력서 분석', 'AI 면접', '구독/결제', '계정', '채용 공고', '기타'];
//                          ^^^ 추가 필요, AI/채용공고는 SERVICE/ETC로 통합 매핑

// 3. 카테고리 매핑 상수 추가
const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  NOTICE: '공지', UPDATE: '업데이트', EVENT: '이벤트', MAINTENANCE: '점검',
};

const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  ACCOUNT: '계정', PAYMENT: '구독/결제', SERVICE: 'AI 서비스', ETC: '기타',
};

const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  REFUND: '환불', PAYMENT_ERROR: '구독/결제', SERVICE: 'AI 서비스', ACCOUNT: '계정', ETC: '기타',
};

const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING: '접수', IN_PROGRESS: '처리 중', COMPLETED: '답변 완료',
};
```

---

## Phase 7 — API 연동

### supportApi.ts 작성

```ts
// frontend/src/user/api/supportApi.ts
import axiosInstance from '@/utils/axiosInstance';

// 공지사항 목록 — 반환: ApiResponse<PageResult<Notice>>.data
export const fetchNotices = (params: {
  category?: NoticeCategory;
  keyword?: string;
  page: number;
  size: number;
}): Promise<{ items: Notice[]; page: number; size: number; totalItems: number; totalPages: number }> =>
  axiosInstance.get('/api/notices', { params }).then(r => r.data.data);

// 공지사항 상세 (view_count 자동 증가)
export const fetchNoticeDetail = (noticeId: number): Promise<NoticeDetail> =>
  axiosInstance.get(`/api/notices/${noticeId}`).then(r => r.data.data);

// FAQ 목록
export const fetchFaqs = (params: {
  category?: FaqCategory;
  keyword?: string;
}): Promise<FaqItem[]> =>
  axiosInstance.get('/api/faqs', { params }).then(r => r.data.data);

// 나의 문의 목록 (로그인 필수)
export const fetchMyInquiries = (params: {
  category?: InquiryCategory;
}): Promise<Inquiry[]> =>
  axiosInstance.get('/api/inquiries', { params }).then(r => r.data.data);

// 문의 접수 (로그인 필수)
export const createInquiry = (body: {
  category: InquiryCategory;
  title: string;
  content: string;
}): Promise<{ inquiryId: number; inquiryStatus: 'PENDING' }> =>
  axiosInstance.post('/api/inquiries', body).then(r => r.data.data);
```

### API 연동 체크리스트

**공지사항**
- [ ] `supportApi.ts` 파일 작성
- [ ] 공지사항 목록 API 연동 및 더미 데이터 제거 (`GET /api/notices`)
- [ ] 카테고리·키워드 필터 쿼리 파라미터 연결
- [ ] 페이지네이션 연결 (page, size)
- [ ] `NoticePage.tsx`에 `이벤트(EVENT)` 카테고리 필터 버튼 추가
- [ ] `is_pinned = true` 건 상단 고정 표시 (서버 응답 기준)
- [ ] `NOTICE_CATEGORY_LABEL` 매핑 상수 적용
- [ ] 공지사항 상세 API 연동 및 더미 데이터 제거 (`GET /api/notices/{noticeId}`)
- [ ] 이전·다음 공지 네비게이션 API 응답 기준으로 연결

**FAQ**
- [ ] FAQ 목록 API 연동 및 더미 데이터 제거 (`GET /api/faqs`)
- [ ] 카테고리·키워드 필터 쿼리 파라미터 연결
- [ ] `FAQ_CATEGORY_LABEL` 매핑 상수 적용 (AI 서비스 통합)
- [ ] FaqPage.tsx 카테고리 필터를 ERD 기준(ACCOUNT/PAYMENT/SERVICE/ETC)으로 재구성

**1:1 문의**
- [ ] 나의 문의 목록 API 연동 및 더미 데이터 제거 (`GET /api/inquiries`)
- [ ] `INQUIRY_CATEGORY_LABEL`, `INQUIRY_STATUS_LABEL` 매핑 상수 적용
- [ ] `InquiryListPage.tsx` 카테고리에 `환불(REFUND)` 추가
- [ ] `InquiryCreatePage.tsx` 문의 유형에 `환불(REFUND)` 추가
- [ ] InquiryCreatePage.tsx 카테고리 선택 시 ERD 영문 값으로 API 전송
- [ ] 문의 접수 API 연동 (`POST /api/inquiries`)
- [ ] 접수 성공 후 완료 화면 표시 (현재 로컬 state 방식 유지 가능)

**공통**
- [ ] `ApiResponse<T>` 형식 기반 성공·실패 처리 (`r.data.data` 언랩)
- [ ] 미로그인 상태에서 문의 목록·접수 시 로그인 페이지 리다이렉트
- [ ] API 실패 시 에러 메시지 표시
- [ ] API 호출 중 로딩 상태(스피너) 표시
