# FastAPI Feature Specification: 신고 AI 검토 보조

**Feature Branch**: `feature/fastapi-admin-report-ai`
**버전**: v1
**Status**: Draft
**담당**: 신보라

---

## 도메인 개요

관리자가 신고 상세를 조회할 때 LLM이 신고 내용을 분석하여 심각도·분류·처리 의견을 생성하는 내부 API.
Spring Boot가 `reports.ai_suggestion`이 null인 경우에만 FastAPI를 호출하며, 결과는 Spring Boot가 DB에 저장한다.
FastAPI는 분석 결과만 반환하며 DB를 직접 읽거나 쓰지 않는다.

---

## User Scenarios & Testing

### User Story 1 — 신고 AI 검토 의견 생성 (Priority: P1)

> 관리자가 신고 상세를 조회할 때 FastAPI가 신고 내용을 LLM으로 분석하여 심각도·분류·처리 의견을 반환한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `targetType`, `reason`, `contentTitle`, `contentBody`를 전달한 상태에서, **When** FastAPI가 LLM을 호출하면, **Then** FastAPI는 `severity`(높음|중간|낮음), `category`(SPAM|ABUSE|AD|INAPPROPRIATE|OTHER), `suggestion`(처리 의견 문장)을 포함한 JSON을 반환해야 한다.
2. **Given** `targetType`이 MEMBER이고 `contentBody`가 null인 상태에서, **When** FastAPI가 요청을 수신하면, **Then** FastAPI는 콘텐츠 없이 `reason`만으로 분석하여 결과를 반환해야 한다.
3. **Given** LLM 호출이 실패하거나 응답 JSON이 올바르지 않은 상태에서, **When** FastAPI가 응답을 처리하면, **Then** FastAPI는 `REPORT_AI_ANALYSIS_FAILED`에 대응 가능한 내부 오류를 반환해야 한다.

---

### User Story 2 — AI 분석 결과 캐시 활용 (Priority: P1)

> ai_suggestion이 이미 존재하는 신고를 재조회할 때 FastAPI를 호출하지 않고 저장된 값을 반환한다.

**Acceptance Scenarios**:
1. **Given** `reports.ai_suggestion`이 이미 저장된 신고를 관리자가 재조회한 상태에서, **When** Spring Boot가 상세 조회를 처리하면, **Then** Spring Boot는 FastAPI를 호출하지 않고 저장된 `ai_suggestion`을 그대로 반환해야 한다.

> 이 시나리오는 Spring Boot 레벨에서 처리되며 FastAPI는 관여하지 않는다.

---

### User Story 3 — FastAPI 장애 시 비크리티컬 처리 (Priority: P1)

> FastAPI 타임아웃 또는 오류 발생 시 신고 상세 조회 자체는 정상 반환되어야 한다.

**Acceptance Scenarios**:
1. **Given** FastAPI 응답이 10초를 초과한 상태에서, **When** Spring Boot가 타임아웃을 감지하면, **Then** Spring Boot는 `ai_suggestion`을 null로 유지한 채 나머지 신고 상세 데이터를 정상 반환해야 한다.
2. **Given** FastAPI가 내부 오류를 반환한 상태에서, **When** Spring Boot가 오류를 수신하면, **Then** Spring Boot는 예외를 외부로 전파하지 않고 `ai_suggestion`을 null로 처리해야 한다.

> 이 시나리오는 Spring Boot 레벨에서 처리되며 FastAPI는 관여하지 않는다.

---

### Edge Cases

- **EC-001**: `contentBody`가 null인 MEMBER 타입 신고 분석 시 → FR-005에 따라 `reason`만으로 LLM 프롬프트를 구성한다.
- **EC-002**: LLM 응답의 `severity` 또는 `category`가 허용 범위 밖의 값이면 → FR-007에 따라 `REPORT_AI_ANALYSIS_FAILED`에 대응 가능한 내부 오류를 반환한다.
- **EC-003**: `contentBody`가 매우 긴 경우(토큰 초과) → LLM 호출 실패로 간주하고 FR-008에 따라 `REPORT_AI_ANALYSIS_FAILED`를 반환한다. Spring Boot는 비크리티컬로 처리하여 `ai_suggestion` null 유지 후 상세 데이터를 정상 반환한다.
- **EC-004**: 동일 신고에 대해 Spring Boot가 동시에 두 번 요청하는 경우 → FastAPI는 stateless하므로 두 번 모두 분석을 수행한다. Spring Boot 레벨에서 `ai_suggestion`이 이미 저장된 경우 재호출하지 않는 null-check(FR-017) 로직으로 중복 분석을 방지하며, 극히 드문 동시 요청 경합은 허용 가능한 수준으로 허용한다.

---

## Requirements

### Functional Requirements

- **FR-001**: FastAPI는 Spring Boot의 내부 호출만 처리해야 하며, 프론트엔드의 직접 호출을 처리 대상으로 간주하지 않아야 한다.
- **FR-002**: FastAPI는 `POST /internal/admin/ai/report-analysis` 요청을 받아 신고 내용을 LLM으로 분석하고 결과를 반환해야 한다.
- **FR-003**: FastAPI는 분석 결과를 `{"severity": "높음|중간|낮음", "category": "SPAM|ABUSE|AD|INAPPROPRIATE|OTHER", "suggestion": "..."}` 형태로 반환해야 한다.
- **FR-004**: FastAPI는 `targetType`, `reason`을 필수 입력으로 받아야 하며, `contentTitle`, `contentBody`는 null 허용이어야 한다.
- **FR-005**: FastAPI는 `targetType`이 MEMBER인 경우 `contentBody` 없이 `reason`만으로 LLM 프롬프트를 구성해야 한다.
- **FR-006**: FastAPI는 `targetType`이 BOARD 또는 COMMENT인 경우 `reason`과 `contentBody`를 함께 LLM 프롬프트에 포함해야 한다.
- **FR-007**: FastAPI는 LLM 응답의 `severity` 또는 `category` 값이 허용 범위(높음|중간|낮음 / SPAM|ABUSE|AD|INAPPROPRIATE|OTHER) 밖이면 `REPORT_AI_ANALYSIS_FAILED`에 대응 가능한 내부 오류를 반환해야 한다.
- **FR-008**: FastAPI는 LLM 응답 파싱 실패 시 `REPORT_AI_ANALYSIS_FAILED`에 대응 가능한 내부 오류를 반환해야 한다.
- **FR-009**: FastAPI는 DB를 직접 읽거나 쓰지 않아야 한다. DB 저장 책임은 Spring Boot가 가진다.
- **FR-010**: FastAPI는 OpenAI 호출 책임을 가져야 하며, Spring Boot가 OpenAI를 직접 호출하지 않아야 한다.
- **FR-011**: FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않고 내부 JSON 성공/실패 계약만 반환해야 한다.
- **FR-012**: FastAPI는 내부 오류를 Spring Boot가 비크리티컬로 처리할 수 있도록 일관된 오류 식별자를 반환해야 한다.

---

### Key Entities

FastAPI는 DB를 읽거나 쓰지 않는다. 아래는 Spring Boot와의 내부 호출 계약이다.

**Request** (`POST /internal/admin/ai/report-analysis`):

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `targetType` | str | Y | BOARD / COMMENT / MEMBER |
| `reason` | str | Y | SPAM / ABUSE / AD / INAPPROPRIATE / OTHER |
| `contentTitle` | str\|null | N | 게시글 제목 (BOARD 전용) |
| `contentBody` | str\|null | N | 게시글·댓글 본문 (MEMBER는 null) |

**Response**:

| 필드 | 타입 | 설명 |
|---|---|---|
| `severity` | str | 높음 / 중간 / 낮음 |
| `category` | str | SPAM / ABUSE / AD / INAPPROPRIATE / OTHER |
| `suggestion` | str | 관리자 처리 의견 문장 |

---

## Success Criteria

- **SC-001**: 신고 분석 요청 시 `severity`, `category`, `suggestion`이 100% 포함된 JSON이 반환된다.
- **SC-002**: `targetType`이 MEMBER인 요청도 `contentBody` 없이 100% 분석 결과가 반환된다.
- **SC-003**: LLM 응답 파싱 실패 또는 `severity` 범위 오류 시 100% `REPORT_AI_ANALYSIS_FAILED` 내부 오류가 반환된다.
- **SC-004**: FastAPI가 DB를 직접 읽거나 쓰지 않는다.
- **SC-005**: Spring Boot가 FastAPI 오류를 수신하면 `ai_suggestion`이 null인 채로 신고 상세가 정상 반환된다.

---

## Assumptions

- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- Spring Boot가 인증·인가 및 `ApiResponse<T>` 래핑을 담당한다.
- Spring Boot → FastAPI 타임아웃은 10초이며, FastAPI 내부 LLM 타임아웃은 이보다 짧게 설정한다.
- DB 저장(`reports.ai_suggestion` 업데이트)은 Spring Boot 책임이며 FastAPI는 결과만 반환한다.
- FastAPI 호출 실패는 비크리티컬로 처리되어 신고 상세 조회 자체는 항상 성공으로 처리된다.
- MVP에서 사용하는 LLM 모델은 OpenAI GPT 계열이며 모델명은 환경변수로 관리한다.
- `contentBody`가 토큰 한도를 초과하는 경우 FastAPI가 앞부분만 잘라서 사용한다(truncation).
