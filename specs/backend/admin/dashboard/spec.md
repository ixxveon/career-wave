# Feature Specification: dashboard

**Feature Branch**: `docs/admin-dashboard-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 관리자가 운영 현황을 한 화면에서 확인한다 (Priority: P1)

> 관리자 권한 사용자는 빠른 운영 판단을 위해 종합 대시보드에서 핵심 KPI와 상태 요약을 조회한다.

**Acceptance Scenarios**:
1. **Given** `MASTER`, `BACKEND`, `CS` 권한의 관리자가 인증된 상태에서, **When** `GET /api/v1/admin/dashboard/summary`를 호출하면, **Then** 시스템은 `ApiResponse<DashboardDTO.ResponseSummary>` 형식으로 KPI, 알림, 상태 요약 데이터를 반환해야 한다.
2. **Given** 관리자가 `range=TODAY`, `range=7D`, `range=30D` 중 하나를 선택한 상태에서, **When** 종합 대시보드 요약을 조회하면, **Then** 시스템은 선택된 기간 범위를 기준으로 집계된 응답을 반환해야 한다.
3. **Given** 특정 섹션에 표시할 데이터가 없는 상태에서, **When** 관리자가 대시보드 요약을 조회하면, **Then** 시스템은 `null` 대신 빈 배열 또는 0 값 기반의 응답 구조를 유지해야 한다.

---

### User Story 2 - 관리자가 권한과 입력값 정책에 맞는 응답을 받는다 (Priority: P2)

> 관리자 권한 사용자는 허용된 범위 내에서만 대시보드 데이터를 조회하고, 잘못된 요청에는 일관된 오류 응답을 받는다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증은 되었지만 `MASTER`, `BACKEND`, `CS` 외 권한인 상태에서, **When** 대시보드 요약 조회를 요청하면, **Then** 시스템은 접근을 거부해야 한다.
2. **Given** 관리자가 허용되지 않은 `range` 값을 포함해 요청한 상태에서, **When** 대시보드 요약 조회를 요청하면, **Then** 시스템은 공통 ErrorCode 정책에 따라 유효하지 않은 Query Parameter 오류를 반환해야 한다.

---

### Edge Cases

- `range`가 `TODAY`, `7D`, `30D` 외 값이면 어떤 공통 오류 응답을 반환해야 하는가?
- 집계 대상 도메인 중 일부 데이터 소스가 비어 있어도 응답 구조를 유지할 수 있는가?
- 특정 섹션의 집계값은 존재하지만 최근 활동 항목이 없을 때 빈 배열 규칙을 일관되게 적용하는가?
- 관리자 인증은 되었지만 세부 역할이 허용되지 않는 경우 `FORBIDDEN` 정책을 일관되게 적용하는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/admin/dashboard/summary` endpoint를 통해 관리자 종합 대시보드 요약 데이터를 조회할 수 있어야 한다.
- **FR-002**: 시스템은 관리자 인증(`ROLE_ADMIN`)과 세부 역할 `MASTER`, `BACKEND`, `CS`에 대해서만 대시보드 요약 조회를 허용해야 한다.
- **FR-003**: 시스템은 Query Parameter `range`로 `TODAY`, `7D`, `30D`만 허용해야 한다.
- **FR-004**: 시스템은 `range` 값이 없을 경우 기본 집계 범위를 `TODAY`로 처리해야 한다.
- **FR-005**: 시스템은 응답을 `ApiResponse<T>` 공통 규격으로 반환해야 한다.
- **FR-006**: 시스템은 응답 본문에 `baseDateTime`, `range`, `kpis`, `alerts`, `weeklySignups`, `paymentRatio`, `serviceCards`, `systemStatus`, `recentActivities`를 포함해야 한다.
- **FR-007**: 시스템은 KPI 섹션에 v1 기준 `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` 4개 식별자를 지원해야 한다.
- **FR-008**: 시스템은 알림, 최근 활동, 시스템 상태, 서비스 카드 등 대시보드 하위 섹션을 화면 계약과 일치하는 구조로 반환해야 한다.
- **FR-009**: 시스템은 데이터가 없는 섹션에 대해 `null`이 아니라 빈 배열 또는 0 기반 집계값을 반환해야 한다.
- **FR-010**: 시스템은 `paymentRatio` 응답이 퍼센트 합계 기준으로 일관된 비율 정보를 제공해야 한다.
- **FR-011**: 시스템은 관리자 계정, 감사 로그, AI 사용량, RAG 문서, 스크래핑 상태 등 관리자 도메인 전반의 집계 기준 시각 컬럼에 `range`를 공통 윈도우로 적용해야 한다.
- **FR-012**: 시스템은 잘못된 `range` 값에 대해 공통 ErrorCode `BAD_REQUEST`를 반환해야 한다.
- **FR-013**: 시스템은 인증이 없는 요청에 대해 `UNAUTHORIZED`, 권한이 없는 요청에 대해 `FORBIDDEN`을 반환해야 한다.
- **FR-014**: 시스템은 서버 내부 집계 실패 시 `INTERNAL_SERVER_ERROR` 공통 오류 응답을 반환해야 한다.
- **FR-015**: Swagger 명세는 Controller가 아니라 `docs` 인터페이스 기준으로 관리해야 한다.
- **FR-016**: 본 도메인은 조회 전용 범위로 제한하며, 대시보드 조회 API에서 생성/수정/삭제 기능은 포함하지 않아야 한다.
- **FR-017**: FastAPI 연동 문서가 없는 현재 범위에서는 Spring Boot가 관리자 대시보드 외부 API 제공과 집계 응답 조합 책임을 담당해야 한다.

### Key Entities

- **admins**: `admin_id`, `created_at`, `last_login_at`, `status`, `admin_role`
- **audit_logs**: `audit_log_id`, `admin_id`, `log_type`, `severity`, `created_at`
- **ai_usage_logs**: `ai_usage_log_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at`
- **ai_ops_settings**: `ai_ops_setting_id`, `monthly_budget`, `alert_enabled`, `alert_threshold`, `rate_limit_enabled`, `updated_at`
- **rag_documents**: `rag_document_id`, `status`, `indexing_progress`, `created_at`, `updated_at`
- **scraping_pipelines**: `scraping_pipeline_id`, `source_name`, `pipeline_status`, `last_started_at`, `last_success_at`, `last_failed_at`
- **scraping_logs**: `scraping_log_id`, `scraping_pipeline_id`, `scraping_status`, `executed_at`, `error_message`

## Success Criteria

- **SC-001**: `GET /api/v1/admin/dashboard/summary` 정상 응답은 100% `ApiResponse<DashboardDTO.ResponseSummary>` 구조를 따른다.
- **SC-002**: `range=TODAY`, `7D`, `30D` 요청은 100% 성공적으로 파싱되며, 허용되지 않은 값은 100% `BAD_REQUEST`로 처리된다.
- **SC-003**: 인증되지 않은 요청은 100% `UNAUTHORIZED`, 비허용 권한 요청은 100% `FORBIDDEN`으로 처리된다.
- **SC-004**: 대시보드 응답의 KPI 섹션은 v1 기준 4개 식별자를 모두 포함한다.
- **SC-005**: 데이터가 없는 하위 섹션은 100% `null`이 아닌 빈 배열 또는 0 값 구조로 반환된다.
- **SC-006**: 대시보드 응답의 시간 값은 100% ISO 8601 형식을 유지한다.

## Assumptions

- 현재 입력 범위에는 `fastapi-schema.md`가 실제로 제공되지 않았으므로, 본 스펙은 Spring Boot 기준으로만 작성한다.
- Spring Boot는 외부 관리자 API 제공, 인증/인가, Query Parameter 검증, 공통 오류 응답, 대시보드 집계 응답 조합 책임을 담당한다.
- FastAPI 연동은 현재 범위 외이며, 추후 내부 집계 API 분리가 확정되면 별도 `fastapi-schema.md`와 책임 분리 문서가 추가될 수 있다.
- React 프론트엔드는 본 문서의 응답 계약을 기준으로 관리자 대시보드 화면을 렌더링한다.
- 대시보드 하위 지표의 세부 집계 공식, 색상/아이콘 정책, 화면 배치 정책은 본 백엔드 스펙 범위 외다.
