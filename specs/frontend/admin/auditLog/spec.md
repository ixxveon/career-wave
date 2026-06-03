# Feature Specification: 관리자 감사 로그

**Feature Branch**: `docs/admin-audit-log-spec`
**Status**: Draft
**Page**: `frontend/src/admin/pages/AuditLog/AuditLogPage.tsx`
**Route**: `/admin/log`

## Feature Overview

관리자 감사 로그는 관리자 관리, AI 메트릭스, 스크래핑 관리에서 발생한 운영 이벤트를 통합해 조회하는 화면이다. 현재 화면은 seed 데이터 기반으로 source별 로그와 상세 패널을 표시한다. MVP에서는 이 구조를 유지하되 서버 API와 연결 가능한 형태로 요약, 목록, 필터, 상세 조회, 상태 처리, 민감 정보 보호 범위를 정의한다.

## User Stories & Acceptance Scenarios

### Story 1 - 감사 로그 요약 확인 (Priority: P1)

관리자는 전체 로그 수와 source별 로그 수를 한눈에 확인한다.

**Acceptance Scenarios**:

1. **Given** 관리자가 `/admin/log`에 진입하면, **When** 요약 API가 성공한다, **Then** 전체 로그, 관리자 로그, AI 로그, 스크래핑 로그 카운트가 표시된다.
2. **Given** 요약 데이터가 0이면, **When** 요약 카드가 렌더링된다, **Then** 0을 정상 값으로 표시한다.
3. **Given** 요약 API가 실패하면, **When** 화면이 렌더링된다, **Then** 요약 영역에 실패 상태를 표시하고 목록 조회 상태와 구분한다.

---

### Story 2 - 감사 로그 목록 조회 (Priority: P1)

관리자는 발생 시각, 등급, source, 메시지를 기준으로 감사 로그 목록을 확인한다.

**Acceptance Scenarios**:

1. **Given** 로그 목록 조회가 성공하면, **When** 테이블이 렌더링된다, **Then** 발생 시각, 등급, source label, 요약 메시지가 표시된다.
2. **Given** 로그가 없으면, **When** 목록 영역이 렌더링된다, **Then** 감사 로그가 없다는 빈 상태를 표시한다.
3. **Given** 목록 API가 실패하면, **When** 화면이 렌더링된다, **Then** 실패 메시지와 재시도 동선을 표시한다.

---

### Story 3 - 필터와 검색 (Priority: P1)

관리자는 source, 등급, 키워드, 기간 조건으로 감사 로그를 좁혀 볼 수 있다.

**Acceptance Scenarios**:

1. **Given** source 탭이 선택되면, **When** 목록 API가 다시 호출된다, **Then** 선택한 source의 로그만 표시된다.
2. **Given** 등급 필터가 선택되면, **When** 목록 API가 다시 호출된다, **Then** 선택한 등급의 로그만 표시된다.
3. **Given** 검색어가 입력되면, **When** 목록 API가 다시 호출된다, **Then** source label, 요약, 상세 요약에 검색어가 포함된 로그만 표시된다.

---

### Story 4 - 로그 상세 확인 (Priority: P2)

관리자는 로그를 선택해 상세 요약과 추적 정보를 확인한다.

**Acceptance Scenarios**:

1. **Given** 로그 행을 클릭하면, **When** 상세 API가 성공한다, **Then** 발생 시각, source, 등급, 요약, 상세 요약, actor, target, requestId가 표시된다.
2. **Given** 필터 변경으로 선택 로그가 현재 목록에서 사라지면, **When** 목록이 갱신된다, **Then** 첫 번째 로그를 선택하거나 상세 빈 상태를 표시한다.
3. **Given** 상세 API가 실패하면, **When** 상세 패널이 렌더링된다, **Then** 상세 조회 실패 상태를 표시한다.

---

### Story 5 - 보안과 권한 오류 처리 (Priority: P1)

관리자는 권한이 있을 때만 감사 로그를 조회하고, 화면에는 민감 정보가 노출되지 않는다.

**Acceptance Scenarios**:

1. **Given** 관리자 토큰이 만료되면, **When** 감사 로그 API가 401을 반환한다, **Then** 로그인 페이지 이동 또는 인증 만료 상태를 표시한다.
2. **Given** `ROLE_ADMIN` 권한이 없으면, **When** 감사 로그 API가 403을 반환한다, **Then** 접근 권한 없음 상태를 표시한다.
3. **Given** 로그 원본에 민감 정보가 포함될 수 있으면, **When** API 응답이 생성된다, **Then** 화면에는 마스킹된 IP와 요약 정보만 표시된다.

## Edge Cases

- source 또는 level 필터가 전체인 경우 query parameter를 생략하거나 프로젝트 표준 방식으로 `ALL`을 전달한다.
- keyword가 공백이면 검색 조건 없이 조회한다.
- 기간 시작값이 종료값보다 늦으면 API 호출 전 검증하거나 400 응답 메시지를 표시한다.
- 로그 카운트가 0이어도 누락으로 취급하지 않는다.
- 목록 조회는 성공했지만 선택 로그 상세 조회가 실패하면 목록은 유지하고 상세 패널에만 실패 상태를 표시한다.

## Requirements

### Functional Requirements

- **FR-001**: 관리자는 감사 로그 요약 카운트를 조회할 수 있어야 한다.
- **FR-002**: 관리자는 감사 로그 목록을 조회할 수 있어야 한다.
- **FR-003**: 관리자는 source, 등급, 키워드, 기간으로 로그를 필터링할 수 있어야 한다.
- **FR-004**: 관리자는 로그 행을 선택해 상세 정보를 확인할 수 있어야 한다.
- **FR-005**: 화면은 로딩, 빈 데이터, 검색 결과 없음, API 실패, 상세 실패 상태를 구분해야 한다.
- **FR-006**: 관리자 감사 로그 API는 JWT와 `ROLE_ADMIN` 권한을 기준으로 보호되어야 한다.
- **FR-007**: 로그 상세에는 민감 정보가 노출되지 않아야 한다.
- **FR-008**: 프론트엔드는 감사 로그 수정 또는 삭제 기능을 제공하지 않아야 한다.

### Key Entities

- **AuditLogSummary**: `totalCount`, `adminCount`, `aiCount`, `scrapingCount`, `warningCount`, `errorCount`, `lastSyncedAt`
- **AuditLogItem**: `id`, `source`, `sourceLabel`, `level`, `summary`, `detailSummary`, `actorId`, `targetType`, `targetId`, `ipAddressMasked`, `occurredAt`
- **AuditLogDetail**: `id`, `source`, `sourceLabel`, `level`, `summary`, `detailSummary`, `actorId`, `targetType`, `targetId`, `ipAddressMasked`, `requestId`, `occurredAt`

## Success Criteria

- **SC-001**: `/admin/log` 진입 후 요약 카드와 감사 로그 목록이 API 응답 기반으로 표시된다.
- **SC-002**: source, level, keyword, page 변경이 API 조회 조건과 일치한다.
- **SC-003**: 로그 선택 시 상세 패널이 API 상세 데이터로 갱신된다.
- **SC-004**: API 실패, 빈 목록, 검색 결과 없음, 권한 오류 상태가 구분되어 표시된다.
- **SC-005**: 로그 목록과 상세에 민감 정보가 노출되지 않는다.

## Assumptions

- 감사 로그 생성과 저장은 백엔드 또는 각 운영 도메인에서 담당한다.
- 프론트엔드는 관리자 감사 로그 조회와 표시만 담당한다.
- v1에서는 `ADMIN`, `AI`, `SCRAPING` source를 우선 지원한다.
- 스펙 경로는 최근 팀 논의에 따라 숫자 prefix 없이 `specs/frontend/admin/auditLog`를 사용한다.

