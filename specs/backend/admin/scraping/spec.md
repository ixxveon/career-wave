# Feature Specification: scraping

**Feature Branch**: `docs/admin-scraping-spec`  
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 파이프라인 운영 현황 조회 (Priority: P1)

> `MASTER`, `BACKEND` 관리자는 외부 관리자 API를 통해 스크래핑 파이프라인 목록, 요약, 상세, 실행 로그를 조회한다.

**Acceptance Scenarios**:
1. **Given** 관리자가 파이프라인 목록을 조회하는 상황에서, **When** `keyword`, `status`, `page`, `size`로 요청하면, **Then** 시스템은 1-based 페이지 구조의 파이프라인 목록을 반환해야 한다.
2. **Given** 관리자가 파이프라인 요약을 조회하는 상황에서, **When** 요약 조회를 요청하면, **Then** 시스템은 상태별 집계와 활성/비활성 집계를 반환해야 한다.
3. **Given** 관리자가 특정 파이프라인의 상세 상태를 확인하는 상황에서, **When** `sourceName`으로 상세 조회를 요청하면, **Then** 시스템은 최근 실행 메타데이터를 포함한 상세 정보를 반환해야 한다.
4. **Given** 관리자가 스크래핑 실행 로그를 조회하는 상황에서, **When** `sourceName`, `status`, `page`, `size`로 요청하면, **Then** 시스템은 1-based 페이지 구조의 실행 로그를 반환해야 한다.

---

### User Story 2 - 파이프라인 실행 제어 (Priority: P1)

> `MASTER`, `BACKEND` 관리자는 외부 관리자 API를 통해 단일 실행, 재시도, 테스트 실행, 일괄 액션 실행을 요청한다.

**Acceptance Scenarios**:
1. **Given** 관리자가 특정 파이프라인 실행을 요청하는 상황에서, **When** `sourceName`과 `actionType = RUN`으로 요청하면, **Then** 시스템은 FastAPI에 실행 요청을 위임하고 접수 결과를 반환해야 한다.
2. **Given** 관리자가 특정 파이프라인 재시도를 요청하는 상황에서, **When** `actionType = RETRY`로 요청하면, **Then** 시스템은 중복 실행 여부를 검증한 뒤 접수 결과를 반환해야 한다.
3. **Given** 관리자가 특정 파이프라인 테스트 실행을 요청하는 상황에서, **When** `actionType = TEST`로 요청하면, **Then** 시스템은 테스트 실행 접수 결과를 반환해야 한다.
4. **Given** 관리자가 여러 파이프라인 일괄 액션을 요청하는 상황에서, **When** `sourceNames`와 `actionType`으로 요청하면, **Then** 시스템은 대상별 접수 결과와 전체 접수 건수를 반환해야 한다.

---

### User Story 3 - 실행 제어 감사 추적 (Priority: P2)

> 실행 제어 요청은 관리자 액션이므로 Audit Log에 기록되어야 하며, Spring Boot와 FastAPI 책임 경계가 유지되어야 한다.

**Acceptance Scenarios**:
1. **Given** 관리자가 실행/재시도/테스트를 요청한 상황에서, **When** Spring Boot가 외부 요청을 수락하면, **Then** 시스템은 관리자 액션에 대한 Audit Log를 기록해야 한다.
2. **Given** 관리자가 일괄 액션을 요청한 상황에서, **When** 요청이 FastAPI로 전달되면, **Then** 시스템은 외부 요청 단위의 Audit Log를 기록해야 한다.
3. **Given** FastAPI 내부 처리 중 오류가 발생한 상황에서, **When** Spring Boot가 내부 오류 응답을 수신하면, **Then** 시스템은 이를 Spring 도메인 ErrorCode로 변환해 외부 실패 응답으로 반환해야 한다.

---

### Edge Cases

- 이미 `RUNNING` 상태인 파이프라인에 대해 실행, 재시도, 테스트 요청이 들어오면 어떻게 거절하는가?
- FastAPI가 지원하지 않는 `sourceName`이 요청되면 어떤 ErrorCode를 반환하는가?
- 일괄 액션 요청에서 일부 파이프라인만 실행 가능한 경우 응답 구조를 어떻게 유지하는가?
- FastAPI 내부 오류와 선택 기능인 실패 알림 오류를 외부 ErrorCode로 어떻게 변환하는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/admin/scraping/pipelines`를 통해 파이프라인 목록 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 목록 조회에서 `keyword`, `status`, `page`, `size`를 지원해야 하며 `page`는 외부 API 기준 1-based로 처리해야 한다.
- **FR-003**: 시스템은 `GET /api/v1/admin/scraping/pipelines/summary`를 통해 파이프라인 요약 조회 기능을 제공해야 한다.
- **FR-004**: 시스템은 `GET /api/v1/admin/scraping/pipelines/{sourceName}`를 통해 단일 파이프라인 상세 조회 기능을 제공해야 한다.
- **FR-005**: 시스템은 `GET /api/v1/admin/scraping/logs`를 통해 스크래핑 실행 로그 조회 기능을 제공해야 한다.
- **FR-006**: 시스템은 로그 조회에서 `sourceName`, `status`, `page`, `size`를 지원해야 하며 `page`는 외부 API 기준 1-based로 처리해야 한다.
- **FR-007**: 시스템은 `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions`를 통해 `RUN`, `RETRY`, `TEST` 액션 요청을 처리해야 한다.
- **FR-008**: 시스템은 `POST /api/v1/admin/scraping/pipelines/batch-actions`를 통해 다수 파이프라인에 대한 일괄 액션 요청을 처리해야 한다.
- **FR-009**: 시스템은 외부 API 권한을 `MASTER`, `BACKEND`로만 제한해야 한다.
- **FR-010**: Spring Boot는 관리자 인증/인가, 권한 검증, Query Parameter 검증, DTO 변환, `ApiResponse<T>` 래핑을 담당해야 한다.
- **FR-011**: Spring Boot는 FastAPI 내부 API를 호출하고 내부 응답을 Spring DTO로 변환해야 한다.
- **FR-012**: Spring Boot는 FastAPI 내부 오류를 `scraping` 도메인 ErrorCode로 변환해야 한다.
- **FR-013**: Spring Boot는 `scraping_pipelines`, `scraping_logs`를 직접 집계하거나 상태 전이를 수행하지 않아야 한다.
- **FR-014**: Spring Repository는 엔티티 매핑, 최소 로컬 검증, Audit Log 연동 보조 용도로만 사용해야 한다.
- **FR-015**: FastAPI는 파이프라인 목록, 요약, 상세, 실행 로그 조회를 처리해야 한다.
- **FR-016**: FastAPI는 단일 실행, 재시도, 테스트 실행, 일괄 실행을 처리해야 한다.
- **FR-017**: FastAPI는 채용 공고 원본 수집, 정제, 중복 제거, `job_notices` 저장을 담당해야 한다.
- **FR-018**: FastAPI는 `scraping_pipelines` 상태 갱신과 `scraping_logs` 실행 로그 기록을 담당해야 한다.
- **FR-019**: FastAPI는 실패 시 오류 메시지를 저장해야 한다.
- **FR-020**: FastAPI는 내부 JSON 계약만 반환하고 외부 `ApiResponse<T>`를 직접 생성하지 않아야 한다.
- **FR-021**: 미지원 `sourceName`은 `SCRAPING_SOURCE_NOT_FOUND`로 처리해야 한다.
- **FR-022**: MVP 1차 Source Registry는 `wanted`, `saramin`만 지원해야 한다.
- **FR-023**: TEST 액션도 실행 시도로 간주하고 중복 실행 방지, 상태 전이, 실행 로그 기록 규칙을 동일하게 적용해야 한다.
- **FR-024**: TEST 액션은 `job_notices` 저장/갱신을 수행하지 않아야 한다.
- **FR-025**: 실행/재시도/테스트/일괄 실행 요청은 관리자 액션으로서 Audit Log 기록 대상이어야 한다.

### Key Entities

- **ScrapingPipeline**: `scraping_pipeline_id`, `source_name`, `display_name`, `pipeline_status`, `is_enabled`, `last_started_at`, `last_success_at`, `last_failed_at`, `last_duration_ms`, `last_total_count`, `last_error_message`, `created_at`, `updated_at`
- **ScrapingLog**: `scraping_log_id`, `scraping_pipeline_id`, `target_site`, `scraping_status`, `total_count`, `error_message`, `executed_at`

## Success Criteria

- **SC-001**: 목록 응답은 100% `ApiResponse<T>`와 1-based `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족한다.
- **SC-002**: Spring Boot는 파이프라인 목록/요약/상세/로그 조회를 직접 집계하지 않고 100% FastAPI 내부 API를 통해 응답을 받는다.
- **SC-003**: 지원하지 않는 `sourceName` 요청은 100% `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.
- **SC-004**: 이미 실행 중인 파이프라인에 대한 중복 실행 요청은 100% `SCRAPING_ALREADY_RUNNING`으로 거절된다.
- **SC-005**: 실행/재시도/테스트/일괄 실행 외부 요청은 100% Audit Log 기록 대상에 포함된다.

## Assumptions

- `scraping`은 Spring Boot + FastAPI 연동 도메인이다.
- Spring Boot는 외부 관리자 API와 응답 계약을 담당하고, FastAPI는 실제 실행/저장/상태 갱신을 담당한다.
- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- FastAPI MVP 1차 지원 source는 `wanted`, `saramin` 두 개다.
- TEST 액션은 실행 로그와 상태 전이는 수행하지만 `job_notices` 저장/갱신은 수행하지 않는다.
- 스크래핑 실패 알림은 MVP 선택 기능이며, 구현되지 않은 경우 `DISCORD_ALERT_SEND_FAILED`는 사용하지 않는다.
