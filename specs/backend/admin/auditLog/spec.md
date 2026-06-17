# Feature Specification: auditLog

**Feature Branch**: `docs/admin-audit-log-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 감사 로그 요약 조회 (Priority: P1)

> 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자는 운영 현황을 빠르게 파악하기 위해 감사 로그 요약 지표를 조회한다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자가 감사 로그 요약 화면에 접근한 상태에서, **When** `from`, `to` 기간 조건으로 요약 조회를 요청하면, **Then** 시스템은 해당 기간 기준의 전체 건수와 `logType`, `severity` 집계 결과를 반환해야 한다.
2. **Given** 기간 조건이 없는 상태에서, **When** 감사 로그 요약 조회를 요청하면, **Then** 시스템은 기본 조회 범위 정책에 따라 요약 집계를 반환해야 한다.
3. **Given** 관리자 인증이 없거나 세부 역할이 `MASTER`, `BACKEND`가 아닌 사용자가 감사 로그 요약 조회를 시도한 상태에서, **When** 요청을 보내면, **Then** 시스템은 권한 부족 오류를 반환해야 한다.

---

### User Story 2 - 감사 로그 목록 조회 (Priority: P1)

> 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자는 운영 이력 추적을 위해 감사 로그 목록을 조건별로 검색하고 페이지 단위로 탐색한다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자가 감사 로그 목록 화면에 접근한 상태에서, **When** `page`, `size`를 포함해 목록 조회를 요청하면, **Then** 시스템은 `ApiResponse<T>`와 1-based 페이지네이션 구조로 감사 로그 목록을 반환해야 한다.
2. **Given** 관리자가 `logType`, `severity`, `keyword`, `from`, `to` 조건을 입력한 상태에서, **When** 목록 조회를 요청하면, **Then** 시스템은 조건과 일치하는 감사 로그만 반환해야 한다.
3. **Given** 허용되지 않은 `logType` 또는 `severity` 값이 전달된 상태에서, **When** 목록 조회를 요청하면, **Then** 시스템은 도메인 ErrorCode 기반 검증 오류를 반환해야 한다.

---

### User Story 3 - 감사 로그 상세 조회 (Priority: P2)

> 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자는 특정 운영 행위의 맥락을 확인하기 위해 단일 감사 로그 상세를 조회한다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증을 통과한 `MASTER` 또는 `BACKEND` 관리자가 특정 감사 로그 식별자를 알고 있는 상태에서, **When** 상세 조회를 요청하면, **Then** 시스템은 해당 로그의 `action`, `targetType`, `targetId`, `ipAddress`, `detail`, `createdAt` 정보를 반환해야 한다.
2. **Given** 존재하지 않는 `logId`가 전달된 상태에서, **When** 상세 조회를 요청하면, **Then** 시스템은 `AUDIT_LOG_NOT_FOUND` 오류를 반환해야 한다.

---

### Edge Cases

- `from`이 `to`보다 이후 시점이면 공통 요청 검증 실패 `400`으로 처리한다.
- 허용되지 않은 `logType` 값이 전달되면 `INVALID_AUDIT_LOG_TYPE`으로 처리한다.
- 허용되지 않은 `severity` 값이 전달되면 `INVALID_AUDIT_LOG_SEVERITY`로 처리한다.
- `page`는 1 이상, `size`는 1 이상 100 이하여야 하며 이를 만족하지 않으면 공통 요청 검증 실패 `400`으로 처리한다.
- `keyword`가 `trim()` 기준 빈 문자열이면 필터를 적용하지 않고, 100자를 초과하면 공통 요청 검증 실패 `400`으로 처리한다.
- `logId`에 해당하는 감사 로그가 존재하지 않으면 `AUDIT_LOG_NOT_FOUND`로 처리한다.

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/admin/audit-logs/summary`를 통해 관리자 인증(`ROLE_ADMIN`)을 통과한 `MASTER`, `BACKEND` 관리자에게 감사 로그 요약 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 감사 로그 요약 조회 시 `from`, `to` Query Parameter 계약을 지원해야 하며, 두 값이 모두 없으면 기본 조회 범위 정책을 적용하고 한쪽만 전달된 경우 열린 구간 조건으로 해석해야 한다.
- **FR-003**: 시스템은 감사 로그 요약 응답에 전체 건수와 `logType`, `severity` 기준 집계 결과를 포함해야 한다.
- **FR-004**: 시스템은 `GET /api/v1/admin/audit-logs`를 통해 관리자 인증(`ROLE_ADMIN`)을 통과한 `MASTER`, `BACKEND` 관리자에게 감사 로그 목록 조회 기능을 제공해야 한다.
- **FR-005**: 시스템은 감사 로그 목록 조회 시 `logType`, `severity`, `keyword`, `from`, `to`, `page`, `size` Query Parameter 계약을 지원해야 한다.
- **FR-006**: 시스템은 `keyword`를 `audit_logs.action`, `audit_logs.target_type`, `audit_logs.target_id`, `audit_logs.detail` 기준 검색 조건으로 해석해야 하며, `trim()` 기준 빈 문자열이면 필터 미적용으로 처리하고 최대 길이는 100자로 제한해야 한다.
- **FR-007**: 시스템은 목록 조회 응답을 `ApiResponse<T>` 래퍼와 `content`, `page`, `size`, `totalElements`, `totalPages` 페이지네이션 구조로 반환해야 한다.
- **FR-008**: 시스템은 외부 API 기준 `page`를 1-based로 처리하고, 백엔드 내부 Pageable 변환에서만 `page - 1`을 적용해야 한다.
- **FR-009**: 시스템은 `GET /api/v1/admin/audit-logs/{logId}`를 통해 관리자 인증(`ROLE_ADMIN`)을 통과한 `MASTER`, `BACKEND` 관리자에게 감사 로그 상세 조회 기능을 제공해야 한다.
- **FR-010**: 시스템은 감사 로그 상세 응답에 `auditLogId`, `adminId`, `logType`, `action`, `targetType`, `targetId`, `ipAddress`, `severity`, `detail`, `createdAt` 정보를 포함해야 한다.
- **FR-011**: 시스템은 존재하지 않는 감사 로그 상세 조회 요청에 대해 `AUDIT_LOG_NOT_FOUND`를 반환해야 한다.
- **FR-012**: 시스템은 허용되지 않은 감사 로그 유형 값이 전달되면 `INVALID_AUDIT_LOG_TYPE`을 반환해야 한다.
- **FR-013**: 시스템은 허용되지 않은 감사 로그 심각도 값이 전달되면 `INVALID_AUDIT_LOG_SEVERITY`를 반환해야 한다.
- **FR-014**: 시스템은 `from`, `to`, `page`, `size`, `keyword`가 유효하지 않은 요청을 공통 요청 검증 실패 `400`으로 처리해야 하며, 잘못된 ISO 8601 UTC 형식, `from > to`, `page < 1`, `size < 1`, `size > 100`, `keyword` 100자 초과를 포함해야 한다.
- **FR-015**: 시스템은 모든 감사 로그 API에 JWT 기반 인증과 역할 기반 인가를 적용해야 한다.
- **FR-016**: 시스템은 문서상 권한 표기 `MASTER`, `BACKEND`, `CS`를 Spring Security의 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`와 일치하도록 해석하며, 관리자 도메인 API는 `ROLE_ADMIN` 인증과 조합해 적용해야 한다.
- **FR-017**: 시스템은 `audit_logs.log_type` 값을 `ADMIN_ACTIVITY`, `ADMIN_MANAGEMENT`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` 범위로 해석해야 한다.
- **FR-018**: 시스템은 `audit_logs.severity` 값을 `INFO`, `WARN`, `ERROR`, `SUCCESS` 범위로 해석해야 한다.
- **FR-019**: 시스템은 `auditLog` 도메인을 조회 전용 범위로 유지해야 하며, 감사 로그 생성, 수정, 삭제 기능 요구사항을 포함하지 않아야 한다.
- **FR-020**: 시스템은 `auditLog` 기능을 관리자 백엔드 범위에서만 제공해야 하며 사용자 기능 요구사항을 포함하지 않아야 한다.

### Key Entities

- **AuditLog**: `audit_log_id`, `admin_id`, `log_type`, `action`, `target_type`, `target_id`, `ip_address`, `severity`, `detail`, `created_at` 컬럼을 가지는 감사 로그 엔티티

## Success Criteria

- **SC-001**: 관리자 인증(`ROLE_ADMIN`)을 통과한 `MASTER` 또는 `BACKEND` 권한 사용자는 감사 로그 요약, 목록, 상세 조회 API를 100% 정상 호출할 수 있다.
- **SC-002**: 관리자 인증이 없거나 세부 역할이 `MASTER`, `BACKEND`가 아닌 사용자의 감사 로그 조회 요청은 100% 인가 실패로 차단된다.
- **SC-003**: 감사 로그 목록 응답은 100% `ApiResponse<T>`와 1-based `page` 기준 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족한다.
- **SC-004**: 허용되지 않은 `logType`, `severity` 요청은 100% 각각 `INVALID_AUDIT_LOG_TYPE`, `INVALID_AUDIT_LOG_SEVERITY`로 처리된다.
- **SC-005**: 존재하지 않는 `logId` 요청은 100% `AUDIT_LOG_NOT_FOUND`로 처리된다.
- **SC-006**: 감사 로그 요약 응답은 전체 건수와 `ADMIN_ACTIVITY`, `ADMIN_MANAGEMENT`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` 기준 집계 필드를 모두 포함한다.
- **SC-007**: `keyword` 공백-only 요청은 100% 필터 미적용으로 처리되고, `keyword` 100자 초과 및 `from > to` 요청은 100% 공통 요청 검증 실패 `400`으로 처리된다.

## Assumptions

- `fastapi-schema.md`가 없으므로 본 스펙은 Spring Boot 기준으로만 작성하며 `auditLog` 도메인에 대한 FastAPI 책임은 없다.
- Spring Boot는 감사 로그 요약 조회, 목록 조회, 상세 조회, JWT 인증 연계, 도메인 ErrorCode 반환 책임을 가진다.
- FastAPI는 본 도메인 범위에서 감사 로그 조회 처리에 참여하지 않으며 Spring Boot를 역호출하지 않는다.
- 외부 연동 주체는 JWT 인증 체계를 사용하는 관리자 프론트엔드이며, 별도 로그 수집 시스템이나 분석 파이프라인은 본 범위에 포함하지 않는다.
- 감사 로그 생성 파이프라인과 로그 적재 배치, 관리자 관리, AI Metrics, 스크래핑, 사용자 도메인 기능은 v1 범위 밖이다.
