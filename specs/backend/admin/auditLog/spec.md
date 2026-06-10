# Feature Specification: auditLog

**Feature Branch**: `feature/admin-audit-log-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 감사 로그 현황 모니터링 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 운영 현황을 빠르게 파악하기 위해 감사 로그 요약 지표를 조회한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 감사 로그 화면에 접근한 상태에서, **When** 기간 조건으로 감사 로그 요약 조회를 요청하면, **Then** 시스템은 전체 건수와 `logType`, `severity` 기준 집계 결과를 반환해야 한다.
2. **Given** 유효한 `from`, `to` 기간이 입력된 상태에서, **When** 감사 로그 요약 조회를 요청하면, **Then** 시스템은 지정 기간에 해당하는 로그만 집계해야 한다.
3. **Given** `MASTER`와 `BACKEND`가 아닌 사용자가 요약 조회를 시도한 상태에서, **When** 요청을 보내면, **Then** 시스템은 권한 부족 오류를 반환해야 한다.

---

### User Story 2 - 감사 로그 목록 탐색 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 운영 이력 추적을 위해 감사 로그 목록을 조건별로 검색하고 페이지 단위로 탐색한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 감사 로그 목록 화면에 접근한 상태에서, **When** 페이지 번호와 크기를 포함해 목록 조회를 요청하면, **Then** 시스템은 `ApiResponse<T>`와 1-based 페이지네이션 구조로 감사 로그 목록을 반환해야 한다.
2. **Given** 관리자가 `logType`, `severity`, `keyword`, `from`, `to` 조건을 입력한 상태에서, **When** 목록 조회를 요청하면, **Then** 시스템은 조건에 일치하는 감사 로그만 반환해야 한다.
3. **Given** 유효하지 않은 페이지 값 또는 검색 조건이 전달된 상태에서, **When** 목록 조회를 요청하면, **Then** 시스템은 정의된 검증 오류를 반환해야 한다.

---

### User Story 3 - 단일 감사 로그 상세 확인 (Priority: P2)

> `MASTER` 또는 `BACKEND` 관리자는 특정 운영 행위의 맥락을 확인하기 위해 단일 감사 로그 상세를 조회한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 특정 감사 로그 식별자를 알고 있는 상태에서, **When** 상세 조회를 요청하면, **Then** 시스템은 해당 로그의 `action`, `targetType`, `targetId`, `ipAddress`, `detail`, `createdAt` 정보를 반환해야 한다.
2. **Given** 존재하지 않는 `logId`가 전달된 상태에서, **When** 상세 조회를 요청하면, **Then** 시스템은 감사 로그 미존재 오류를 반환해야 한다.

---

### Edge Cases

- `from`이 `to`보다 이후 시점이면 어떻게 처리하는가?
- 존재하지 않는 `logId`로 상세 조회를 요청하면 어떻게 처리하는가?
- 허용되지 않은 `logType` 또는 `severity` 값이 전달되면 어떻게 처리하는가?
- `page`, `size`가 유효하지 않은 값이면 어떻게 처리하는가?
- `keyword`가 빈 문자열이거나 길이 제한을 초과하면 어떻게 처리하는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `MASTER` 또는 `BACKEND` 관리자에게 감사 로그 요약 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 감사 로그 요약 조회 시 `from`, `to` 기간 조건을 적용할 수 있어야 한다.
- **FR-003**: 시스템은 감사 로그 요약 응답에 전체 건수와 `logType`, `severity` 기준 집계 값을 포함해야 한다.
- **FR-004**: 시스템은 `MASTER` 또는 `BACKEND` 관리자에게 감사 로그 목록 조회 기능을 제공해야 한다.
- **FR-005**: 시스템은 감사 로그 목록 조회 시 `logType`, `severity`, `keyword`, `from`, `to`, `page`, `size` 조건을 지원해야 한다.
- **FR-006**: 시스템은 감사 로그 목록 응답을 `ApiResponse<T>` 래퍼와 페이지네이션 구조(`content`, `page`, `size`, `totalElements`, `totalPages`)로 반환해야 한다.
- **FR-007**: 시스템은 외부 API의 페이지 번호를 1-based로 유지하고 내부 Pageable 변환 시 `page - 1`을 적용해야 한다.
- **FR-008**: 시스템은 `MASTER` 또는 `BACKEND` 관리자에게 단일 감사 로그 상세 조회 기능을 제공해야 한다.
- **FR-009**: 시스템은 감사 로그 상세 응답에 `auditLogId`, `adminId`, `logType`, `action`, `targetType`, `targetId`, `ipAddress`, `severity`, `detail`, `createdAt` 정보를 포함해야 한다.
- **FR-010**: 시스템은 존재하지 않는 감사 로그 식별자 요청에 대해 `AUDIT_LOG_NOT_FOUND` 오류를 반환해야 한다.
- **FR-011**: 시스템은 유효하지 않은 감사 로그 검색 조건에 대해 정의된 `ErrorCode` 기반 검증 오류를 반환해야 한다.
- **FR-012**: 시스템은 `keyword`가 빈 문자열이면 미입력과 동일하게 처리하고, 길이 제한을 초과하면 정의된 `ErrorCode` 기반 검증 오류를 반환해야 한다.
- **FR-013**: 시스템은 유효하지 않은 감사 로그 조회 기간에 대해 정의된 `ErrorCode` 기반 검증 오류를 반환해야 한다.
- **FR-014**: 시스템은 모든 감사 로그 API에 JWT 기반 인증과 역할 기반 접근 제어를 적용해야 한다.
- **FR-015**: 시스템은 문서상 권한 명칭 `MASTER`, `BACKEND`, `CS`를 Spring Security의 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑해야 한다.
- **FR-016**: 시스템은 `audit_logs.log_type` 값을 `ADMIN_ACTIVITY`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM`으로 제한해야 한다.
- **FR-017**: 시스템은 `audit_logs.severity` 값을 `INFO`, `WARN`, `ERROR`, `SUCCESS`로 제한해야 한다.
- **FR-018**: 시스템은 감사 로그 API를 읽기 전용 조회 범위로 유지해야 하며 생성, 수정, 삭제 기능을 포함하지 않아야 한다.
- **FR-019**: 시스템은 감사 로그 기능을 `admin` 패키지 범위에서 유지해야 하며 사용자 기능 요구사항을 포함하지 않아야 한다.

### Key Entities

- **AuditLog**: `audit_log_id`, `admin_id`, `log_type`, `action`, `target_type`, `target_id`, `ip_address`, `severity`, `detail`, `created_at`을 관리하는 감사 로그 엔티티

## Success Criteria

- **SC-001**: `MASTER` 또는 `BACKEND` 권한 사용자는 감사 로그 요약, 목록, 상세 조회 API를 모두 정상 수행할 수 있다.
- **SC-002**: `MASTER`, `BACKEND`가 아닌 사용자의 감사 로그 조회 요청은 100% 권한 오류로 차단된다.
- **SC-003**: 감사 로그 목록 응답은 100% `ApiResponse<T>`와 1-based 페이지네이션 구조를 만족한다.
- **SC-004**: 유효하지 않은 `logType`, `severity`, 기간 조건, 페이지 조건 요청은 모두 정의된 검증 오류로 처리된다.
- **SC-005**: 존재하지 않는 `logId` 요청은 100% `AUDIT_LOG_NOT_FOUND` 오류로 처리된다.
- **SC-006**: 감사 로그 요약 응답은 `logType`, `severity` 기준 집계 필드를 모두 포함한다.

## Assumptions

- 본 문서는 `auditLog` 도메인의 감사 로그 요약, 목록, 상세 조회 범위만 다루며 로그 생성 정책, 로그 적재 파이프라인, 다른 운영 도메인의 쓰기 기능은 범위 외로 본다.
- 감사 로그 조회 기능은 Spring Boot 백엔드에서 직접 처리하며 FastAPI 연동은 없다.
- Query Parameter, API 경로, 응답 규격, enum 값, 권한 정책은 `api-schema.md` 기준으로 확정되어 있으며 본 문서는 해당 계약을 기준으로 기능 요구사항만 정리한다.
