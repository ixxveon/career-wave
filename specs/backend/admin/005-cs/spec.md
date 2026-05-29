# Feature Specification: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**Status**: Draft
**담당**: 신보라

---

## 도메인 개요

공지사항·FAQ CRUD와 1:1 문의 답변 처리 REST API.
AI 초안 생성 기능은 FastAPI LLM 서버 연동으로 별도 처리한다.

---

## ERD

```sql
-- 공지사항
CREATE TABLE notices (
  notice_id   BIGSERIAL    PRIMARY KEY,
  admin_id    BIGINT       NOT NULL REFERENCES admins(admin_id),
  category    VARCHAR(20)  NOT NULL CHECK (category IN ('NOTICE','UPDATE','EVENT','MAINTENANCE')),
  title       VARCHAR(200) NOT NULL,
  content     TEXT,
  is_visible  BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- FAQ
CREATE TABLE faqs (
  faq_id      BIGSERIAL    PRIMARY KEY,
  admin_id    BIGINT       NOT NULL REFERENCES admins(admin_id),
  category    VARCHAR(20)  NOT NULL CHECK (category IN ('ACCOUNT','PAYMENT','SERVICE','ETC')),
  question    VARCHAR(500) NOT NULL,
  answer      TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 1:1 문의
CREATE TABLE inquiries (
  inquiry_id      BIGSERIAL    PRIMARY KEY,
  member_id       UUID         NOT NULL REFERENCES members(id),
  admin_id        BIGINT       NULL REFERENCES admins(admin_id),
                  -- PENDING 시 NULL 허용. IN_PROGRESS/COMPLETED 전이 시 애플리케이션 레벨에서 NOT NULL 검증.
  category        VARCHAR(20)  NOT NULL
                  CHECK (category IN ('REFUND','PAYMENT_ERROR','SERVICE','ACCOUNT','ETC')),
  title           VARCHAR(200) NOT NULL,
  content         TEXT         NOT NULL,
  reply           TEXT         NULL,
  inquiry_status  VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                  CHECK (inquiry_status IN ('PENDING','IN_PROGRESS','COMPLETED')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  replied_at      TIMESTAMPTZ  NULL,
  completed_at    TIMESTAMPTZ  NULL,

  CONSTRAINT chk_replied_at
    CHECK (inquiry_status = 'PENDING' OR replied_at IS NOT NULL),
  CONSTRAINT chk_completed_at
    CHECK (inquiry_status != 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE INDEX idx_inquiries_status   ON inquiries(inquiry_status);
CREATE INDEX idx_inquiries_category ON inquiries(category);
CREATE INDEX idx_inquiries_member   ON inquiries(member_id);
```

---

## User Stories & Acceptance Scenarios

### Story 1 — 공지사항 목록 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 관리자 인증 토큰, **When** `GET /admin/notices`, **Then** 공지 목록 + 페이징 반환
2. **Given** `visible=true` 쿼리, **When** 조회, **Then** 노출 공지만 반환

---

### Story 2 — 공지사항 CRUD (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 유효한 요청, **When** `POST /admin/notices`, **Then** 201 + 생성된 공지 반환
2. **Given** 유효한 `noticeId`, **When** `PUT /admin/notices/{noticeId}`, **Then** 수정 후 200 반환
3. **Given** 유효한 `noticeId`, **When** `DELETE /admin/notices/{noticeId}`, **Then** 204 반환
4. **Given** 존재하지 않는 `noticeId`, **When** 조회/수정/삭제, **Then** 404 반환

---

### Story 3 — FAQ CRUD (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 관리자 인증 토큰, **When** `GET /admin/faqs`, **Then** FAQ 목록 반환
2. **Given** 유효한 요청, **When** `POST /admin/faqs`, **Then** 201 + 생성된 FAQ 반환
3. **Given** 유효한 `faqId`, **When** `PUT /admin/faqs/{faqId}`, **Then** 수정 후 200 반환
4. **Given** 유효한 `faqId`, **When** `DELETE /admin/faqs/{faqId}`, **Then** 204 반환

---

### Story 4 — 1:1 문의 목록 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 관리자 인증, **When** `GET /admin/inquiries`, **Then** 문의 목록 + 페이징 반환
2. **Given** `category=REFUND` 쿼리, **When** 조회, **Then** 환불 카테고리 문의만 반환
3. **Given** `status=PENDING` 쿼리, **When** 조회, **Then** 미답변 문의만 반환

---

### Story 5 — 1:1 문의 답변 저장 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** `PENDING` 문의, **When** `PUT /admin/inquiries/{inquiryId}/reply` + reply 본문, **Then** `inquiry_status → IN_PROGRESS`, `replied_at` 기록, 200 반환
2. **Given** 이미 `IN_PROGRESS` 문의, **When** 답변 수정, **Then** reply 업데이트, status 유지, 200 반환
3. **Given** `COMPLETED` 문의, **When** 답변 수정 시도, **Then** 409 반환

---

### Story 6 — 1:1 문의 처리 완료 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** `IN_PROGRESS` 문의, **When** `PUT /admin/inquiries/{inquiryId}/complete`, **Then** `inquiry_status → COMPLETED`, `completed_at` 기록, 200 반환
2. **Given** `PENDING` 문의, **When** 직접 완료 시도, **Then** 400 반환 (IN_PROGRESS 선행 필요)

---

### Story 7 — AI 초안 생성 (Priority: P2)

**Acceptance Scenarios**:
1. **Given** `POST /admin/ai/notice-draft` + `{category, title}`, **When** 요청, **Then** LLM 생성 초안 반환
2. **Given** `POST /admin/ai/faq-draft` + `{question}`, **When** 요청, **Then** LLM 생성 답변 초안 반환
3. **Given** `POST /admin/ai/inquiry-draft` + `{category, title, content}`, **When** 요청, **Then** 카테고리별 LLM 맞춤 답변 초안 반환
4. **Given** FastAPI 서버 응답 지연, **When** 타임아웃(10초), **Then** 503 반환

---

### Edge Cases

- `COMPLETED` 문의 답변 수정 → 409 Conflict
- `PENDING` 문의를 바로 `COMPLETE` 처리 → 400 Bad Request
- 존재하지 않는 `inquiryId` → 404
- AI 서버 장애 시 초안 생성 실패 → 503 반환, 프론트에서 재시도 안내

---

## API 명세

### 공지사항

| Method | Path | Description |
|---|---|---|
| GET | `/admin/notices` | 공지사항 목록 조회 |
| GET | `/admin/notices/{noticeId}` | 공지사항 단건 조회 |
| POST | `/admin/notices` | 공지사항 등록 |
| PUT | `/admin/notices/{noticeId}` | 공지사항 수정 |
| DELETE | `/admin/notices/{noticeId}` | 공지사항 삭제 |

#### GET /admin/notices

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | String | NOTICE/UPDATE/EVENT/MAINTENANCE |
| `visible` | Boolean | 노출 여부 필터 |
| `page` | int | 페이지 번호 (default: 0) |
| `size` | int | 페이지 크기 (default: 20) |

**Response**:
```json
{
  "content": [
    {
      "noticeId": 1,
      "category": "NOTICE",
      "title": "Career Wave 서비스 오픈 안내",
      "content": "...",
      "isVisible": true,
      "createdAt": "2026-05-20T10:00:00Z"
    }
  ],
  "totalElements": 4,
  "totalPages": 1
}
```

#### POST /admin/notices

**Request Body**:
```json
{
  "category": "NOTICE",
  "title": "공지 제목",
  "content": "공지 내용",
  "isVisible": true
}
```

---

### FAQ

| Method | Path | Description |
|---|---|---|
| GET | `/admin/faqs` | FAQ 목록 조회 |
| POST | `/admin/faqs` | FAQ 등록 |
| PUT | `/admin/faqs/{faqId}` | FAQ 수정 |
| DELETE | `/admin/faqs/{faqId}` | FAQ 삭제 |

---

### 1:1 문의

| Method | Path | Description |
|---|---|---|
| GET | `/admin/inquiries` | 문의 목록 조회 |
| GET | `/admin/inquiries/{inquiryId}` | 문의 상세 조회 |
| PUT | `/admin/inquiries/{inquiryId}/reply` | 답변 저장 |
| PUT | `/admin/inquiries/{inquiryId}/complete` | 처리 완료 |

#### GET /admin/inquiries

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | String | REFUND/PAYMENT_ERROR/SERVICE/ACCOUNT/ETC |
| `status` | String | PENDING/IN_PROGRESS/COMPLETED |
| `page` | int | 페이지 번호 |
| `size` | int | 페이지 크기 |

**Response**:
```json
{
  "content": [
    {
      "inquiryId": 501,
      "memberName": "김민지",
      "category": "PAYMENT_ERROR",
      "title": "결제 오류가 계속 발생합니다",
      "createdAt": "2026-05-22T09:00:00Z",
      "inquiryStatus": "PENDING"
    }
  ],
  "totalElements": 4,
  "totalPages": 1
}
```

#### PUT /admin/inquiries/{inquiryId}/reply

**Request Body**:
```json
{
  "reply": "안녕하세요, 김민지 님. 불편을 드려 죄송합니다..."
}
```

**Response**:
```json
{
  "inquiryId": 501,
  "inquiryStatus": "IN_PROGRESS",
  "reply": "...",
  "repliedAt": "2026-05-28T14:00:00Z"
}
```

---

### AI 초안 생성 (FastAPI 연동)

| Method | Path | Description |
|---|---|---|
| POST | `/admin/ai/notice-draft` | 공지 초안 생성 |
| POST | `/admin/ai/faq-draft` | FAQ 답변 초안 생성 |
| POST | `/admin/ai/inquiry-draft` | 문의 답변 초안 생성 |

#### POST /admin/ai/inquiry-draft

**Request Body**:
```json
{
  "category": "REFUND",
  "title": "구독 환불 요청드립니다",
  "content": "결제한 지 3일밖에 안 됐고 AI 기능은 한 번도 사용하지 않았습니다."
}
```

**Response**:
```json
{
  "draft": "안녕하세요, Career Wave 고객센터입니다.\n\n환불 요청 접수해 주셔서 감사합니다..."
}
```

---

## Functional Requirements

- **FR-001**: 공지사항/FAQ CRUD — JWT 인증 + ADMIN 권한 필수
- **FR-002**: 문의 목록 조회 시 `category`, `status` 복합 필터 지원
- **FR-003**: 답변 저장 시 `PENDING → IN_PROGRESS` 상태 전이 및 `replied_at`, `admin_id` 기록
- **FR-004**: 처리 완료 시 `IN_PROGRESS → COMPLETED` 상태 전이 및 `completed_at` 기록
- **FR-005**: `COMPLETED` 문의 답변 수정 요청 → 409 반환
- **FR-006**: `PENDING` 문의 직접 완료 처리 요청 → 400 반환
- **FR-007**: AI 초안 API는 Spring → FastAPI 내부 호출 방식으로 처리 (외부 미노출)
- **FR-008**: AI 서버 타임아웃(10초) 초과 시 503 반환

---

## Success Criteria

- **SC-001**: 공지사항/FAQ 등록 후 목록 조회 시 즉시 반영
- **SC-002**: 답변 저장 시 상태 전이 및 타임스탬프 정확히 기록
- **SC-003**: 카테고리·상태 복합 필터 교집합 결과 정확히 반환
- **SC-004**: AI 서버 장애 시 503 반환, 기존 기능(CRUD) 영향 없음

---

## Assumptions

- 공지사항/FAQ는 어드민 전용 (회원 조회 API는 별도 user-backend 담당)
- 1:1 문의 접수(회원 → 서버)는 user-backend 담당, 어드민은 조회·답변만 처리
- 답변 알림(이메일/앱 푸시)은 v1 범위 외
- AI 초안 생성은 FastAPI LLM 서버와 Spring 내부 통신 (RestTemplate 또는 WebClient)
- REFUND 카테고리 문의 → CS 어드민이 접수 확인 후 결제·정산 페이지에서 실제 환불 처리
