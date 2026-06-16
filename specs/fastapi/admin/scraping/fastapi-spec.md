# FastAPI Feature Specification: scraping

**Feature Branch**: `docs/admin-scraping-spec`  
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 내부 조회 API 처리 (Priority: P1)

> FastAPI는 Spring Boot의 내부 호출을 받아 파이프라인 목록, 요약, 상세, 실행 로그 조회를 처리한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 파이프라인 목록 조회를 요청한 상황에서, **When** FastAPI가 `keyword`, `status`, `page`, `size` Query Parameter를 받으면, **Then** 1-based 페이지 구조의 목록 응답을 반환해야 한다.
2. **Given** Spring Boot가 파이프라인 요약 조회를 요청한 상황에서, **When** FastAPI가 요약 조회를 처리하면, **Then** 상태별 집계와 활성/비활성 집계를 반환해야 한다.
3. **Given** Spring Boot가 단일 파이프라인 상세 또는 실행 로그 조회를 요청한 상황에서, **When** FastAPI가 `sourceName`, `status`, `page`, `size` Query Parameter를 받으면, **Then** 문서화된 내부 응답 계약으로 반환해야 한다.

---

### User Story 2 - 실행/재시도/테스트/일괄 액션 처리 (Priority: P1)

> FastAPI는 실제 실행 주체로서 단일 실행, 재시도, 테스트, 일괄 액션을 처리한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 단일 실행 또는 재시도 요청을 보낸 상황에서, **When** FastAPI가 실행 가능 여부를 검증하면, **Then** 중복 실행을 차단하고 접수 결과를 반환해야 한다.
2. **Given** Spring Boot가 테스트 실행 요청을 보낸 상황에서, **When** FastAPI가 TEST 액션을 수락하면, **Then** TEST 액션도 실행 시도로 취급하고 상태 전이 및 실행 로그 기록을 수행해야 한다.
3. **Given** Spring Boot가 일괄 액션 요청을 보낸 상황에서, **When** FastAPI가 `actionType`, `sourceNames`를 검증하면, **Then** 대상별 접수 결과와 전체 접수 건수를 반환해야 한다.

---

### User Story 3 - 공고 수집/정제/저장 및 상태 반영 (Priority: P2)

> FastAPI는 실제 스크래핑 실행 후 채용 공고를 정제하고 중복 제거 후 저장하며, 실행 상태와 실행 로그를 기록한다.

**Acceptance Scenarios**:
1. **Given** 실제 실행 또는 재시도 액션이 시작된 상황에서, **When** FastAPI가 외부 사이트에서 원본 공고를 수집하면, **Then** 공고를 정제하고 중복 제거 후 `job_notices` 저장까지 수행해야 한다.
2. **Given** TEST 액션이 시작된 상황에서, **When** FastAPI가 수집/파싱/정제 가능성을 검증하면, **Then** 실행 로그와 상태 전이는 수행하되 `job_notices` 저장은 수행하지 않아야 한다.
3. **Given** 실행이 성공 또는 실패로 종료된 상황에서, **When** FastAPI가 종료 처리를 수행하면, **Then** `scraping_pipelines` 상태와 `scraping_logs` 기록을 일관되게 반영해야 한다.

---

### Edge Cases

- `wanted`, `saramin` 외 `sourceName` 요청은 어떻게 처리하는가?
- `RUNNING` 상태 파이프라인에 TEST 액션이 다시 들어오면 어떻게 거절하는가?
- 실행 실패와 알림 실패가 동시에 발생하면 어떤 오류를 우선 기록하는가?
- TEST 액션이 성공해도 저장을 수행하지 않을 때 결과 상태를 어떻게 유지하는가?

## Requirements

### Functional Requirements

- **FR-001**: FastAPI는 `GET /internal/scraping/pipelines`를 통해 목록 조회를 처리해야 한다.
- **FR-002**: FastAPI는 GET 내부 조회 API에서 Request Body를 사용하지 않고 Query Parameter를 사용해야 한다.
- **FR-003**: FastAPI는 `GET /internal/scraping/pipelines/summary`를 통해 요약 조회를 처리해야 한다.
- **FR-004**: FastAPI는 `GET /internal/scraping/pipelines/{sourceName}`를 통해 상세 조회를 처리해야 한다.
- **FR-005**: FastAPI는 `GET /internal/scraping/logs`를 통해 실행 로그 조회를 처리해야 한다.
- **FR-006**: FastAPI는 내부 조회 API의 페이지 규칙을 1-based로 유지해야 한다.
- **FR-007**: FastAPI는 `POST /internal/scraping/pipelines/{sourceName}/run`을 통해 단일 실행을 처리해야 한다.
- **FR-008**: FastAPI는 `POST /internal/scraping/pipelines/{sourceName}/retry`를 통해 단일 재시도를 처리해야 한다.
- **FR-009**: FastAPI는 `POST /internal/scraping/pipelines/{sourceName}/test`를 통해 단일 테스트 실행을 처리해야 한다.
- **FR-010**: FastAPI는 `POST /internal/scraping/pipelines/batch-run`을 통해 일괄 액션 실행을 처리해야 한다.
- **FR-011**: FastAPI는 MVP 1차에서 `wanted`, `saramin`만 지원해야 한다.
- **FR-012**: 미지원 `sourceName`은 `SCRAPING_SOURCE_NOT_FOUND`로 처리해야 한다.
- **FR-013**: FastAPI는 동일 `sourceName` 파이프라인의 중복 실행, 재시도, 테스트를 차단해야 한다.
- **FR-014**: FastAPI는 채용 공고 원본 수집을 담당해야 한다.
- **FR-015**: FastAPI는 수집한 채용 공고를 정제해야 한다.
- **FR-016**: FastAPI는 `source + original_url` 기준으로 중복 제거를 수행해야 한다.
- **FR-017**: FastAPI는 실제 실행/재시도 액션에 한해 `job_notices` 저장/갱신을 수행해야 한다.
- **FR-018**: FastAPI는 TEST 액션에서 `job_notices` 저장/갱신을 수행하지 않아야 한다.
- **FR-019**: FastAPI는 실행 시작 시 `pipeline_status = RUNNING`, `last_started_at`, `updated_at`을 갱신해야 한다.
- **FR-020**: FastAPI는 실행 성공 시 `SUCCESS`, `last_success_at`, `last_duration_ms`, `last_totalCount`, `updated_at`을 갱신해야 한다.
- **FR-021**: FastAPI는 실행 실패 시 `FAILED`, `last_failed_at`, `last_error_message`, `updated_at`을 갱신해야 한다.
- **FR-022**: FastAPI는 모든 실행 시도를 `scraping_logs`에 기록해야 한다.
- **FR-023**: TEST 액션도 `scraping_logs` 기록 대상이어야 한다.
- **FR-024**: FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않아야 한다.
- **FR-025**: FastAPI는 내부 오류 응답에 Spring Boot가 변환 가능한 `errorCode`를 포함해야 한다.
- **FR-026**: FastAPI는 `SCRAPING_PIPELINE_NOT_FOUND`, `SCRAPING_SOURCE_NOT_FOUND`, `SCRAPING_ALREADY_RUNNING`, `SCRAPING_EXECUTION_FAILED`, `SCRAPING_TEST_FAILED`, `FASTAPI_INTERNAL_ERROR`를 내부 오류 식별자로 사용할 수 있어야 한다.
- **FR-027**: `DISCORD_ALERT_SEND_FAILED`는 선택 기능인 실패 알림이 구현된 경우에만 조건부로 사용해야 한다.

### Key Entities

- **ScrapingPipeline**: `scraping_pipeline_id`, `source_name`, `display_name`, `pipeline_status`, `is_enabled`, `last_started_at`, `last_success_at`, `last_failed_at`, `last_duration_ms`, `last_total_count`, `last_error_message`, `created_at`, `updated_at`
- **ScrapingLog**: `scraping_log_id`, `scraping_pipeline_id`, `target_site`, `scraping_status`, `total_count`, `error_message`, `executed_at`

## Success Criteria

- **SC-001**: 모든 GET 내부 조회 API는 Request Body 없이 Query Parameter로 동작한다.
- **SC-002**: 미지원 `sourceName` 요청은 100% `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.
- **SC-003**: 중복 실행/재시도/테스트 요청은 100% 차단된다.
- **SC-004**: TEST 액션은 100% 실행 로그 기록과 상태 전이를 수행하지만 `job_notices` 저장은 수행하지 않는다.
- **SC-005**: 실제 실행/재시도 액션은 100% `source + original_url` 기준 중복 제거 후 `job_notices` 저장 정책을 따른다.

## Assumptions

- FastAPI는 Spring Boot의 내부 호출만 처리한다.
- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- Spring Boot는 외부 관리자 API, 권한, DTO, `ApiResponse<T>`, ErrorCode 변환을 담당한다.
- 실패 알림은 MVP 선택 기능이다.
