# Feature Specification: 고객센터 관리 (Customer Service)

**Feature Branch**: `feature/admin-cs-ui`
**Status**: UI 구현 완료 — API 연동 예정
**담당**: 신보라

---

## 도메인 개요

공지사항·FAQ 콘텐츠 관리와 회원 1:1 문의 처리를 담당하는 어드민 페이지.
CS 페이지는 **소통 채널 관리** 역할이며, 환불 실제 처리는 결제·정산 페이지에서 담당한다.

---

## 상태 정의

### inquiries.inquiry_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 접수 중 | 회원 문의 접수, 미답변 |
| `IN_PROGRESS` | 답변 중 | 관리자 답변 작성 중 또는 저장 완료 |
| `COMPLETED` | 완료 | 처리 완료 |

### 상태 전이도

```text
PENDING → IN_PROGRESS → COMPLETED
  (답변 저장)   (처리 완료 버튼)
```

### inquiries.inquiry_category

| 값 | 표시 |
|---|---|
| `REFUND` | 환불 |
| `PAYMENT_ERROR` | 결제오류 |
| `SERVICE` | 서비스 |
| `ACCOUNT` | 계정 |
| `ETC` | 기타 |

---

## User Stories & Acceptance Scenarios

### Story 1 — 공지사항 목록 조회 (Priority: P1)

> 관리자는 등록된 공지사항 목록을 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인, **When** 공지사항 탭 진입, **Then** 번호/카테고리/제목/등록일/노출 여부 목록이 표시된다.

---

### Story 2 — 공지사항 등록/수정/삭제 (Priority: P1)

> 관리자는 공지사항을 등록하고 수정·삭제할 수 있다.

**Acceptance Scenarios**:
1. **Given** "+ 공지 등록" 클릭, **When** 카테고리·제목·내용·노출 여부 입력 후 등록, **Then** 목록에 추가된다.
2. **Given** 기존 공지, **When** 수정 클릭 후 저장, **Then** 변경 내용이 반영된다.
3. **Given** 기존 공지, **When** 삭제 클릭, **Then** 목록에서 제거된다.
4. **Given** 제목 미입력, **When** 등록 시도, **Then** 저장되지 않는다.

---

### Story 3 — AI 공지 초안 생성 (Priority: P2)

> 관리자는 카테고리와 제목을 입력한 뒤 AI가 생성한 공지 내용 초안을 활용할 수 있다.

**Acceptance Scenarios**:
1. **Given** 카테고리·제목 입력 상태, **When** "AI 초안 생성" 클릭, **Then** 로딩 후 내용 필드에 초안이 자동 입력된다.
2. **Given** 제목 미입력 상태, **When** 버튼 비활성화, **Then** 클릭 불가.
3. **Given** AI 초안이 입력된 상태, **When** 관리자가 내용 직접 수정, **Then** 수정 내용이 유지된 채 저장 가능.

---

### Story 4 — FAQ 목록 조회/등록/수정/삭제 (Priority: P1)

> 관리자는 FAQ를 관리할 수 있다.

**Acceptance Scenarios**:
1. **Given** FAQ 탭, **When** 진입, **Then** 카테고리/질문/등록일 목록이 표시된다.
2. **Given** "+ FAQ 등록" 클릭, **When** 카테고리·질문·답변 입력 후 등록, **Then** 목록에 추가된다.
3. **Given** 기존 FAQ, **When** 수정·삭제, **Then** 변경 반영/목록에서 제거된다.

---

### Story 5 — AI FAQ 답변 초안 생성 (Priority: P2)

> 관리자는 질문을 입력한 뒤 AI가 생성한 답변 초안을 활용할 수 있다.

**Acceptance Scenarios**:
1. **Given** 질문 입력 상태, **When** "AI 답변 초안" 클릭, **Then** 로딩 후 답변 필드에 초안이 자동 입력된다.
2. **Given** 질문 미입력 상태, **When** 버튼 비활성화, **Then** 클릭 불가.

---

### Story 6 — 1:1 문의 목록 조회 (Priority: P1)

> 관리자는 회원 1:1 문의를 카테고리/상태별로 필터링하여 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 1:1 문의 탭, **When** 진입, **Then** 문의 ID/회원명/카테고리/제목/접수일/상태 목록이 표시된다.
2. **Given** 카테고리 필터 선택, **When** 조회, **Then** 해당 카테고리 문의만 표시된다.
3. **Given** 상태 필터 선택, **When** 조회, **Then** 해당 상태 문의만 표시된다.
4. **Given** `PENDING` 문의, **When** 목록 확인, **Then** "답변하기" 버튼이 강조 표시된다.

---

### Story 7 — 1:1 문의 답변 작성 (Priority: P1)

> 관리자는 문의 상세 모달에서 답변을 작성하고 저장할 수 있다.

**Acceptance Scenarios**:
1. **Given** 문의 상세 모달, **When** 진입, **Then** 카테고리/상태/문의 내용 + 답변 입력창이 표시된다.
2. **Given** 기존 답변이 있는 경우, **When** 모달 열기, **Then** 이전 답변이 입력창에 미리 채워진다.
3. **Given** 답변 입력 후 "답변 저장" 클릭, **When** `PENDING` 상태인 경우, **Then** `inquiry_status → IN_PROGRESS` 로 변경된다.
4. **Given** `IN_PROGRESS` 상태에서 "처리 완료" 클릭, **When** 처리, **Then** `inquiry_status → COMPLETED` 로 변경된다.
5. **Given** `COMPLETED` 상태인 문의, **When** 모달 열기, **Then** 답변 저장/처리 완료 버튼이 비노출된다.

---

### Story 8 — AI 문의 답변 초안 생성 (Priority: P2)

> 관리자는 AI가 카테고리 기반으로 생성한 답변 초안을 활용할 수 있다.

**Acceptance Scenarios**:
1. **Given** 문의 상세 모달, **When** "AI 답변 초안" 클릭, **Then** 로딩 후 카테고리별 맞춤 답변 초안이 답변 입력창에 자동 입력된다.
2. **Given** 카테고리별 초안 내용:
   - `REFUND` → 환불 정책 안내 (7일·AI 미이용 조건) + 처리 절차 안내
   - `PAYMENT_ERROR` → 결제 오류 체크리스트 안내
   - `SERVICE` → 기술팀 확인 중 안내
   - `ACCOUNT` → 본인 확인 절차 안내
   - `ETC` → 확인 후 답변 예정 안내

---

### Edge Cases

- 공지 내용 없이 제목만 입력 후 등록 → 내용 빈 채로 등록 허용 (필수 아님)
- FAQ 답변 없이 질문만 등록 → 등록 허용 (초안 미작성 상태로 관리 가능)
- `COMPLETED` 문의에 답변 수정 시도 → 수정 불가 (버튼 비노출)
- 동일 회원이 동일 내용으로 중복 문의 → 별도 inquiry_id 생성 (중복 체크 없음)
- AI 초안 생성 후 내용을 비워도 저장 → 저장 가능 (빈 답변 허용)

---

## Functional Requirements

- **FR-001**: 공지사항 CRUD — 카테고리(공지/업데이트/이벤트/점검), 제목, 내용, 노출 여부 관리
- **FR-002**: FAQ CRUD — 카테고리(계정/결제/서비스/기타), 질문, 답변 관리
- **FR-003**: 1:1 문의 목록을 카테고리·상태 기준 필터링 조회
- **FR-004**: 문의 상세 모달에서 답변 입력 및 저장
- **FR-005**: 답변 저장 시 `PENDING → IN_PROGRESS` 자동 상태 전이
- **FR-006**: "처리 완료" 버튼으로 `IN_PROGRESS → COMPLETED` 전이
- **FR-007**: AI 공지 초안 — 카테고리·제목 기반 초안 생성 (FastAPI LLM 연동)
- **FR-008**: AI FAQ 답변 초안 — 질문 기반 초안 생성 (FastAPI LLM 연동)
- **FR-009**: AI 문의 답변 초안 — 카테고리별 맞춤 초안 생성 (FastAPI LLM 연동)
- **FR-010**: KPI 집계 — 등록된 공지 수 / FAQ 수 / 미답변(PENDING) 문의 수 / 답변 중(IN_PROGRESS) 수

---

## Key Entities

### notices
| 필드 | 타입 | 설명 |
|---|---|---|
| `notice_id` | BIGSERIAL PK | 공지 ID |
| `admin_id` | BIGINT FK | 작성 관리자 |
| `category` | VARCHAR | 공지/업데이트/이벤트/점검 |
| `title` | VARCHAR NOT NULL | 제목 |
| `content` | TEXT | 내용 |
| `is_visible` | BOOLEAN DEFAULT true | 노출 여부 |
| `is_pinned` | BOOLEAN DEFAULT false | 공지 고정 여부 (User 목록 상단 고정) |
| `view_count` | INT DEFAULT 0 | 조회수 (User 상세 페이지 조회 시 증가) |
| `created_at` | TIMESTAMPTZ | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |

### faqs
| 필드 | 타입 | 설명 |
|---|---|---|
| `faq_id` | BIGSERIAL PK | FAQ ID |
| `admin_id` | BIGINT FK | 작성 관리자 |
| `category` | VARCHAR | 계정/결제/서비스/기타 |
| `question` | VARCHAR NOT NULL | 질문 |
| `answer` | TEXT | 답변 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |

### inquiries
| 필드 | 타입 | 설명 |
|---|---|---|
| `inquiry_id` | BIGSERIAL PK | 문의 ID |
| `member_id` | UUID FK | 문의 회원 |
| `admin_id` | BIGINT FK NULL | 담당 관리자 (미배정 시 NULL) |
| `category` | VARCHAR | REFUND/PAYMENT_ERROR/SERVICE/ACCOUNT/ETC |
| `title` | VARCHAR NOT NULL | 제목 |
| `content` | TEXT NOT NULL | 문의 내용 |
| `reply` | TEXT NULL | 관리자 답변 |
| `inquiry_status` | VARCHAR | PENDING/IN_PROGRESS/COMPLETED |
| `created_at` | TIMESTAMPTZ | 접수 시각 |
| `updated_at` | TIMESTAMPTZ | 수정 시각 |
| `replied_at` | TIMESTAMPTZ NULL | 최초 답변 시각 |
| `completed_at` | TIMESTAMPTZ NULL | 처리 완료 시각 |

---

## AI 기능 명세

| 기능 | 입력 | 출력 | 연동 |
|---|---|---|---|
| 공지 초안 생성 | `category`, `title` | 공지 내용 초안(text) | FastAPI `/admin/ai/notice-draft` |
| FAQ 답변 초안 | `question` | 답변 초안(text) | FastAPI `/admin/ai/faq-draft` |
| 문의 답변 초안 | `category`, `title`, `content` | 답변 초안(text) | FastAPI `/admin/ai/inquiry-draft` |

> 현재 v1은 mock 구현. FastAPI LLM 연동 시 위 엔드포인트로 교체.

---

## Success Criteria

- **SC-001**: 공지사항/FAQ CRUD 정상 동작 (등록→목록 반영, 수정→변경 반영, 삭제→제거)
- **SC-002**: 문의 답변 저장 시 `PENDING → IN_PROGRESS` 상태 전이가 정확히 동작
- **SC-003**: `COMPLETED` 문의는 답변 수정 불가 (버튼 비노출)
- **SC-004**: 카테고리·상태 필터 조합 시 교집합 결과 정확히 반환
- **SC-005**: AI 초안 생성 버튼은 필수 입력 미완료 시 비활성화

---

## Assumptions

- 공지사항/FAQ는 어드민이 직접 작성·관리 (회원 노출 여부만 제어)
- 1:1 문의는 회원 앱에서 접수, 어드민에서 답변만 처리
- 답변 알림(이메일/앱 푸시)은 v1 범위 외 — 백엔드 연동 시 별도 구현
- AI 기능은 FastAPI LLM 서버 연동 예정, v1은 mock UI만 구성
- 환불 문의(REFUND 카테고리)는 CS에서 접수 확인 후 결제·정산 페이지에서 실제 환불 처리
