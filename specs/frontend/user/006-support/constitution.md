# Constitution: 사용자 고객센터 (User Support)

**Feature Branch**: `feature/user-support-fe-spec`
**Scope**: 공지사항 / FAQ / 1:1 문의
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

회원은 서비스 공지사항과 FAQ를 통해 스스로 궁금증을 해결하고,
해결되지 않는 경우 1:1 문의를 통해 관리자의 도움을 받을 수 있어야 한다.

---

## 2. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 3탭 구조 | 공지사항 / FAQ / 1:1 문의 | SupportPage.tsx 기준 유지 |
| 공지·FAQ 비로그인 허용 | 로그인 없이 조회 가능 | 서비스 정보 접근성 보장 |
| 문의 로그인 필수 | 목록·접수 모두 로그인 필요 | 회원 식별 필요 |
| 카테고리 매핑 상수 | ERD 영문 값 → UI 한글 변환 | ERD 값을 프론트에서 직접 표시하지 않음 |
| inquiry_status 매핑 | PENDING→접수, IN_PROGRESS→처리 중, COMPLETED→답변 완료 | 사용자 친화적 표시 |
| 조회수 증가 | 공지 상세 진입 시 서버 API 호출 | 클라이언트에서 직접 증가 금지 |
| 핀 공지 우선 정렬 | `is_pinned=true` 건을 목록 최상단 표시 | 중요 공지 노출 보장 |
| FAQ 단일 열림 | 하나의 항목만 열림 (아코디언) | 기존 UI 구현 기준 유지 |

---

## 3. 불변 규칙

- `is_visible = false` 공지사항은 절대 User에게 노출하지 않는다.
- 1:1 문의 목록은 반드시 로그인한 회원 본인의 문의만 표시한다.
- 조회수(`view_count`) 증가는 클라이언트에서 직접 처리하지 않고 서버 API를 호출한다.
- `inquiry_status` 값은 ERD 기준(PENDING / IN_PROGRESS / COMPLETED)으로 저장하고, UI에서 한글로 변환하여 표시한다.
- 카테고리 값은 ERD 영문 기준으로 API 송수신하고, UI 표시만 한글로 변환한다.
- 문의 접수 시 카테고리·제목·내용(10자 이상)이 모두 입력되어야 접수 버튼이 활성화된다.
- `PENDING` 문의에는 "답변 대기 중" 안내를 표시하고, 답변 내용을 표시하지 않는다.

---

## 4. 연동 계약

- `user-backend`는 아래 API를 제공한다:
  - `GET /api/notices` — 공지사항 목록 (category, keyword, page, size)
  - `GET /api/notices/{noticeId}` — 공지사항 상세 + 조회수 증가
  - `GET /api/faqs` — FAQ 목록 (category, keyword)
  - `GET /api/inquiries` — 나의 문의 목록 (category) — 로그인 필수
  - `POST /api/inquiries` — 문의 접수 — 로그인 필수
- 모든 응답은 `ApiResponse<T>` 형식을 사용한다.
- 모든 HTTP 호출은 `frontend/src/user/api/supportApi.ts`를 통해서만 수행한다.

---

## 5. 카테고리 매핑 기준

### 공지사항 (notices.category)
```ts
const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  NOTICE:      '공지',
  UPDATE:      '업데이트',
  EVENT:       '이벤트',
  MAINTENANCE: '점검',
};
```

### FAQ (faqs.category)
```ts
const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  ACCOUNT: '계정',
  PAYMENT: '구독/결제',
  SERVICE: 'AI 서비스',
  ETC:     '기타',
};
```

### 1:1 문의 카테고리 (inquiries.category)
```ts
const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  REFUND:        '환불',
  PAYMENT_ERROR: '구독/결제',
  SERVICE:       'AI 서비스',
  ACCOUNT:       '계정',
  ETC:           '기타',
};
```

### 1:1 문의 상태 (inquiries.inquiry_status)
```ts
const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  PENDING:     '접수',
  IN_PROGRESS: '처리 중',
  COMPLETED:   '답변 완료',
};
```

---

## 6. 금지 패턴

- `is_visible = false` 공지를 User 목록·상세에 노출하는 것을 금지한다.
- 타인의 문의 내역을 조회하는 것을 금지한다. (member_id 기준 필터 필수)
- 조회수를 클라이언트에서 직접 증가시키는 것을 금지한다.
- ERD에 없는 카테고리 값을 코드에서 가정하는 것을 금지한다.
- 관리자 전용 API(`/api/admin/`)를 User 페이지에서 직접 호출하는 것을 금지한다.
