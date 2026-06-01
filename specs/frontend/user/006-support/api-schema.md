# API Schema: 사용자 고객센터 (User Support)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> 모든 HTTP 호출은 `frontend/src/user/api/supportApi.ts`를 통해서만 수행한다.

---

## Enums & 매핑 상수

```ts
type NoticeCategory   = 'NOTICE' | 'UPDATE' | 'EVENT' | 'MAINTENANCE';
type FaqCategory      = 'ACCOUNT' | 'PAYMENT' | 'SERVICE' | 'ETC';
type InquiryCategory  = 'REFUND' | 'PAYMENT_ERROR' | 'SERVICE' | 'ACCOUNT' | 'ETC';
type InquiryStatus    = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

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

## Interfaces

```ts
interface Notice {
  noticeId: number;
  category: NoticeCategory;
  title: string;
  createdAt: string;
  isPinned: boolean;
  viewCount: number;
}

interface NoticeDetail extends Notice {
  content: string;
  updatedAt: string;
  prevNotice: { noticeId: number; title: string } | null;
  nextNotice: { noticeId: number; title: string } | null;
}

interface FaqItem {
  faqId: number;
  category: FaqCategory;
  question: string;
  answer: string;
  createdAt: string;
}

interface Inquiry {
  inquiryId: number;
  category: InquiryCategory;
  title: string;
  content: string;
  reply: string | null;        // null이면 미답변
  inquiryStatus: InquiryStatus;
  createdAt: string;
}
```

---

## API 목록

### 공지사항 목록 조회

```http
GET /api/notices?category=&keyword=&page=1&size=20
응답: ApiResponse<{ items: Notice[]; page: number; size: number; totalItems: number; totalPages: number }>
```

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | NoticeCategory | 카테고리 필터 (생략 시 전체) |
| `keyword` | string | 제목 검색 (생략 시 전체) |
| `page` | number | 페이지 번호 (1-based, default: 1) |
| `size` | number | 페이지 크기 (default: 20) |

> `is_visible = true` 건만 반환. `is_pinned = true` 건 상단 정렬 후 반환.

---

### 공지사항 상세 조회

```http
GET /api/notices/{noticeId}
응답: ApiResponse<NoticeDetail>
```

> 호출 시 서버에서 `view_count + 1` 처리 (클라이언트 직접 증가 금지).

---

### FAQ 목록 조회

```http
GET /api/faqs?category=&keyword=
응답: ApiResponse<FaqItem[]>
```

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | FaqCategory | 카테고리 필터 (생략 시 전체) |
| `keyword` | string | 질문·답변 검색 (생략 시 전체) |

> 페이지네이션 없음 — 전체 목록 반환.

---

### 나의 문의 목록 조회 (로그인 필수)

```http
GET /api/inquiries?category=
응답: ApiResponse<Inquiry[]>
```

> 로그인한 회원 본인의 문의만 반환. `created_at DESC` 정렬.

---

### 문의 접수 (로그인 필수)

```http
POST /api/inquiries
Body: { category: InquiryCategory; title: string; content: string }
응답: ApiResponse<{ inquiryId: number; inquiryStatus: 'PENDING' }>
```

> 접수 성공 시 `inquiry_status = PENDING`으로 생성.

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 공지사항 조회 실패 |
| `UNAUTHORIZED` | 401 | 문의 목록·접수 시 미로그인 |
| `INVALID_INQUIRY_CONTENT` | 400 | 문의 내용 10자 미만 |
