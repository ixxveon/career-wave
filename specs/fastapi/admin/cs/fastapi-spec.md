# FastAPI Feature Specification: CS AI 초안 생성

**Feature Branch**: `feature/fastapi-admin-cs-ai`
**버전**: v1
**Status**: Draft
**담당**: 신보라

---

## 도메인 개요

관리자가 공지사항·FAQ·1:1 문의 답변을 작성할 때 LLM 기반 초안을 생성해 반환하는 내부 API.
Spring Boot가 관리자 요청을 수신한 뒤 FastAPI를 내부 호출하며, 프론트엔드는 FastAPI를 직접 호출하지 않는다.
초안은 DB에 저장하지 않고 생성 즉시 반환한다.

---

## User Scenarios & Testing

### User Story 1 — 공지사항 초안 생성 (Priority: P1)

> 관리자가 공지사항 카테고리와 제목을 입력하면 FastAPI가 LLM을 호출해 본문 초안을 생성한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `category`(NOTICE|UPDATE|EVENT|MAINTENANCE)와 `title`을 전달한 상태에서, **When** FastAPI가 LLM을 호출하면, **Then** FastAPI는 카테고리 톤에 맞는 공지 본문 초안을 `draft` 필드로 반환해야 한다.
2. **Given** `title`이 빈 문자열인 상태에서, **When** FastAPI가 요청을 수신하면, **Then** FastAPI는 `CS_DRAFT_INVALID_INPUT`에 대응 가능한 내부 오류를 반환해야 한다.
3. **Given** LLM 호출이 실패하거나 응답이 비어 있는 상태에서, **When** FastAPI가 응답을 처리하면, **Then** FastAPI는 `CS_AI_GENERATION_FAILED`에 대응 가능한 내부 오류를 반환해야 한다.

---

### User Story 2 — FAQ 답변 초안 생성 (Priority: P1)

> 관리자가 FAQ 질문을 입력하면 FastAPI가 LLM을 호출해 답변 초안을 생성한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `question`을 전달한 상태에서, **When** FastAPI가 LLM을 호출하면, **Then** FastAPI는 질문에 대응하는 FAQ 답변 초안을 `draft` 필드로 반환해야 한다.
2. **Given** `question`이 빈 문자열인 상태에서, **When** FastAPI가 요청을 수신하면, **Then** FastAPI는 `CS_DRAFT_INVALID_INPUT`에 대응 가능한 내부 오류를 반환해야 한다.

---

### User Story 3 — 문의 답변 초안 생성 (Priority: P1)

> 관리자가 1:1 문의 카테고리·제목·내용을 전달하면 FastAPI가 LLM을 호출해 답변 초안을 생성한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `category`(REFUND|PAYMENT_ERROR|SERVICE|ACCOUNT|ETC), `title`, `content`를 전달한 상태에서, **When** FastAPI가 LLM을 호출하면, **Then** FastAPI는 문의 내용에 맞는 답변 초안을 `draft` 필드로 반환해야 한다.
2. **Given** `content`가 빈 문자열인 상태에서, **When** FastAPI가 요청을 수신하면, **Then** FastAPI는 `CS_DRAFT_INVALID_INPUT`에 대응 가능한 내부 오류를 반환해야 한다.
3. **Given** LLM 호출이 타임아웃(10초 초과)된 상태에서, **When** FastAPI가 응답을 처리하면, **Then** FastAPI는 `CS_AI_GENERATION_FAILED`에 대응 가능한 내부 오류를 반환하고 Spring Boot는 503 AI_SERVER_UNAVAILABLE을 반환해야 한다.

---

### Edge Cases

- `title`은 있지만 `category`가 허용 범위 밖의 값이면 어떤 내부 오류를 반환하는가?
- LLM이 `draft` 필드를 반환했지만 값이 빈 문자열이면 성공으로 처리하는가, 실패로 처리하는가?
- Spring Boot 타임아웃(10초)과 FastAPI 내부 LLM 타임아웃 설정이 다를 경우 어느 쪽이 먼저 끊기는가?

---

## Requirements

### Functional Requirements

- **FR-001**: FastAPI는 Spring Boot의 내부 호출만 처리해야 하며, 프론트엔드의 직접 호출을 처리 대상으로 간주하지 않아야 한다.
- **FR-002**: FastAPI는 `POST /api/v1/ai/notice-draft` 요청을 받아 `category`와 `title` 기반 공지 본문 초안을 생성해 반환해야 한다.
- **FR-003**: FastAPI는 `POST /api/v1/ai/faq-draft` 요청을 받아 `question` 기반 FAQ 답변 초안을 생성해 반환해야 한다.
- **FR-004**: FastAPI는 `POST /api/v1/ai/inquiry-draft` 요청을 받아 `category`, `title`, `content` 기반 문의 답변 초안을 생성해 반환해야 한다.
- **FR-005**: FastAPI는 초안 생성 결과를 `{"draft": "..."}` 형태로 반환해야 한다.
- **FR-006**: FastAPI는 `title` 또는 `content`가 빈 문자열인 경우 `CS_DRAFT_INVALID_INPUT`에 대응 가능한 내부 오류를 반환해야 한다.
- **FR-007**: FastAPI는 LLM 응답의 `draft` 값이 null 또는 빈 문자열인 경우 `CS_AI_GENERATION_FAILED`에 대응 가능한 내부 오류를 반환해야 한다.
- **FR-008**: FastAPI는 OpenAI 호출 책임을 가져야 하며, Spring Boot가 OpenAI를 직접 호출하지 않아야 한다.
- **FR-009**: FastAPI는 카테고리별로 시스템 프롬프트를 분리하여 LLM 호출 컨텍스트를 구성해야 한다.
- **FR-010**: FastAPI는 생성된 초안을 DB에 저장하지 않아야 한다.
- **FR-011**: FastAPI는 내부 오류를 Spring Boot가 `AI_SERVER_UNAVAILABLE`로 매핑할 수 있도록 일관된 오류 식별자를 반환해야 한다.
- **FR-012**: FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않고 내부 JSON 성공/실패 계약만 반환해야 한다.

---

### Key Entities

FastAPI는 DB를 읽거나 쓰지 않는다. 아래는 LLM 호출에 사용하는 입력 데이터 계약이다.

| 엔드포인트 | 입력 필드 | 출력 필드 |
|---|---|---|
| `/api/v1/ai/notice-draft` | `category` (str), `title` (str) | `draft` (str) |
| `/api/v1/ai/faq-draft` | `question` (str) | `draft` (str) |
| `/api/v1/ai/inquiry-draft` | `category` (str), `title` (str), `content` (str) | `draft` (str) |

---

## Success Criteria

- **SC-001**: 공지사항 초안 요청 시 카테고리 톤에 맞는 `draft`가 100% 반환된다.
- **SC-002**: FAQ 초안 요청 시 질문에 대응하는 `draft`가 100% 반환된다.
- **SC-003**: 문의 초안 요청 시 문의 내용에 맞는 `draft`가 100% 반환된다.
- **SC-004**: 필수 필드가 빈 문자열인 요청은 100% `CS_DRAFT_INVALID_INPUT` 내부 오류로 거부된다.
- **SC-005**: LLM 응답 `draft`가 빈 문자열이면 100% `CS_AI_GENERATION_FAILED` 내부 오류가 반환된다.
- **SC-006**: 생성된 초안이 DB에 저장되지 않는다.

---

## Assumptions

- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- Spring Boot가 인증·인가 및 `ApiResponse<T>` 래핑을 담당한다.
- Spring Boot → FastAPI 타임아웃은 10초이며, FastAPI 내부 LLM 타임아웃은 이보다 짧게 설정한다.
- 초안은 관리자가 직접 수정 후 저장하므로 FastAPI가 DB에 저장할 책임을 갖지 않는다.
- MVP에서 사용하는 LLM 모델은 OpenAI GPT 계열이며 모델명은 환경변수로 관리한다.
