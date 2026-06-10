# Feature Specification: 관리자 스크래핑 관리

**Feature Branch**: `feature/admin-scraping-spec`
**Status**: Draft
**Page**: `frontend/src/admin/pages/Scraping/ScrapingPage.tsx`
**Route**: `/admin/scraping`

## Overview

관리자 스크래핑 관리는 채용 공고 수집 source의 최근 실행 결과를 조회하고, 실패한 source를 운영자가 실행, 재시도, 테스트할 수 있게 하는 화면이다.

현재 화면은 mock 데이터 기반의 파이프라인 테이블과 실시간 로그 영역으로 구성되어 있다. MVP에서는 이 구조를 유지하되, 서버 API와 연결 가능한 형태로 source 목록, 최근 실행 결과 필터, 페이지네이션, 액션 요청, 운영 로그 조회 범위를 정의한다.

## User Scenarios & Testing

### User Story 1 - source 목록과 최근 실행 결과 확인 (Priority: P1)

관리자는 각 스크래핑 source의 최근 실행 결과, 성공률, 평균 응답 시간, 수집 건수, 최근 오류를 한 화면에서 확인한다.

**Acceptance Scenarios**:

1. **Given** 관리자가 `/admin/scraping`에 진입하면, **When** source 목록 조회가 성공한다, **Then** source, 최근 실행 결과, 성공률, 평균 응답, 주기, 수집 건수, 최근 오류가 표시된다.
2. **Given** 최근 실행 결과가 `FAILED`이면, **When** 테이블이 렌더링된다, **Then** 실패 상태가 위험 스타일로 표시된다.

### User Story 2 - 검색, 실행 결과 필터, 페이지네이션 (Priority: P1)

관리자는 source명 또는 오류 키워드로 source를 검색하고 최근 실행 결과별로 필터링한다.

**Acceptance Scenarios**:

1. **Given** 검색어가 입력되면, **When** 목록 API가 다시 호출된다, **Then** source 또는 최근 오류에 검색어가 포함된 source만 표시된다.
2. **Given** 실행 결과 필터가 선택되면, **When** 목록 API가 다시 호출된다, **Then** 선택한 `SUCCESS` 또는 `FAILED` 결과의 source만 표시된다.
3. **Given** 결과가 여러 페이지이면, **When** 관리자가 페이지를 변경한다, **Then** 해당 페이지의 source가 표시된다.

### User Story 3 - source 실행 액션 요청 (Priority: P2)

관리자는 단일 source에 대해 실행, 재시도, 테스트 액션을 요청한다.

**Acceptance Scenarios**:

1. **Given** `FAILED` 결과의 source가 있으면, **When** 관리자가 재시도를 클릭한다, **Then** 재시도 요청 API가 호출되고 요청 접수 상태가 표시된다.
2. **Given** 관리자가 테스트를 클릭하면, **When** 테스트 요청 API가 호출된다, **Then** 실제 저장 없이 selector/schema 검증 요청이 접수된다.
3. **Given** 액션 요청이 실패하면, **When** 응답 오류가 반환된다, **Then** 실패 안내와 기존 최근 실행 결과가 유지된다.

### User Story 4 - 운영 로그 확인 (Priority: P2)

관리자는 스크래핑 실행 결과와 장애 원인을 로그로 확인한다.

**Acceptance Scenarios**:

1. **Given** 로그 조회가 성공하면, **When** 로그 콘솔이 표시된다, **Then** 발생 시각, 실행 결과, 메시지, 상세 내용이 표시된다.
2. **Given** 로그 상태가 `FAILED`이면, **When** 로그 행이 표시된다, **Then** 오류 상태가 명확히 강조된다.
3. **Given** 로그에 외부 응답 원문이나 인증 정보가 포함될 수 있으면, **When** API 응답이 생성된다, **Then** 민감 정보는 제거된 요약만 내려온다.

### User Story 5 - 일괄 선택 및 운영 준비 (Priority: P3)

관리자는 보이는 행을 선택해 향후 일괄 액션을 수행할 수 있도록 선택 상태를 관리한다.

**Acceptance Scenarios**:

1. **Given** source 목록이 표시되면, **When** 관리자가 전체 선택 체크박스를 클릭한다, **Then** 현재 페이지의 source가 선택된다.
2. **Given** 일부 source가 선택되어 있으면, **When** 관리자가 행 체크박스를 해제한다, **Then** 해당 source만 선택 해제된다.

## Edge Cases

- source 목록이 비어 있으면 빈 상태와 재조회 동선을 표시한다.
- 검색 결과가 없으면 검색 조건을 유지한 채 빈 상태를 표시한다.
- 액션 요청 중에는 중복 클릭을 방지한다.
- `FAILED` 상태가 아닌 source의 재시도 요청은 서버 정책에 따라 제한될 수 있다.
- 일시 중지, 재개, 복구 중 같은 파이프라인 수명주기 상태는 현재 ERD에 없으므로 별도 백엔드 계약 확정 전까지 제공하지 않는다.
- 로그 상세에는 토큰, 쿠키, 프록시 주소, 외부 응답 전문을 표시하지 않는다.

## Functional Requirements

- **FR-001**: 관리자는 스크래핑 source 목록을 조회할 수 있어야 한다.
- **FR-002**: 관리자는 source별 최근 실행 결과, 성공률, 평균 응답 시간, 주기, 수집 건수, 최근 오류를 확인할 수 있어야 한다.
- **FR-003**: 관리자는 source명 또는 최근 오류 기준으로 검색할 수 있어야 한다.
- **FR-004**: 관리자는 ERD `scraping_status` 기준 `SUCCESS` 또는 `FAILED`로 source를 필터링할 수 있어야 한다.
- **FR-005**: 관리자는 source 목록 페이지를 이동할 수 있어야 한다.
- **FR-006**: 관리자는 단일 source 실행, 재시도, 테스트를 요청할 수 있어야 한다.
- **FR-007**: 관리자는 스크래핑 운영 로그를 조회할 수 있어야 한다.
- **FR-008**: 관리자는 로그 실행 결과와 메시지를 기준으로 장애 원인을 파악할 수 있어야 한다.
- **FR-009**: 화면은 로딩, 빈 데이터, API 실패, 액션 실패 상태를 구분해 표시해야 한다.
- **FR-010**: 관리자 API는 JWT와 `MASTER`, `BACKEND` 권한을 기준으로 보호되어야 한다.

## Key Entities

- **ScrapingSource**: source명, 최근 실행 결과, 성공률, 평균 응답 시간, 주기, 수집 건수, 최근 오류, 갱신 시각
- **ScrapingSourceSummary**: 실행 결과별 source 수, 총 수집 건수, 평균 성공률, 평균 응답 시간
- **ScrapingActionRequest**: 액션 타입, 사유, 대상 source
- **ScrapingActionResult**: 액션 접수 여부, 실행 ID, 요청 시각
- **ScrapingLog**: 발생 시각, source명, ERD `scraping_status`, 메시지, 상세, 실행 ID

## Success Criteria

- **SC-001**: 화면 진입 후 source 목록과 주요 실행 결과가 1초 이내 렌더링된다.
- **SC-002**: 검색어, 실행 결과 필터, 페이지 변경이 API 조회 조건과 일치한다.
- **SC-003**: 실행성 액션 성공 후 해당 행의 최신 실행 결과가 재조회된다.
- **SC-004**: 실패 로그에서 민감 정보가 노출되지 않는다.
- **SC-005**: API 실패, 빈 목록, 액션 실패가 사용자에게 구분되어 표시된다.

## Assumptions

- 실제 스크래핑 실행은 FastAPI 파이프라인 또는 백엔드 배치 계층에서 처리한다.
- 관리자 프론트엔드는 상태 조회와 제어 요청만 수행한다.
- 외부 채용 플랫폼별 상세 연동 정책은 별도 backend 또는 fastapi 스펙에서 정의한다.
- 스펙 경로는 최근 팀 논의에 따라 숫자 prefix 없이 `specs/frontend/admin/scraping`을 사용한다.
