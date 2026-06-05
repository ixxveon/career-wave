# Feature Specification: 관리자 관리

**Feature Branch**: `feature/admin-management-api`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/AdminManagement/AdminManagementPage.tsx`

## Branch Strategy

- Phase 1 구현 브랜치는 최신 `develop`을 기준으로 `feature/admin-management-api`를 생성한다.
- Phase 2 이후 구현 브랜치는 직전 Phase 브랜치를 기준으로 생성한다.
- 선행 Phase PR이 `develop`에 병합되면 후속 Phase 브랜치는 최신 `develop` 기준으로 rebase하거나 PR base를 조정한다.
- 각 Phase PR은 해당 Phase의 tasks 범위만 포함한다.

## Feature Overview

관리자 관리는 어드민 사용자 계정, 역할 기반 접근 제어, IP ACL, 보안 감사 로그를 관리하는 화면이다. 모든 API는 JWT 인증과 `ROLE_ADMIN` 권한을 전제로 하며, `MASTER`는 `ROLE_ADMIN` 내부의 관리자 세부 역할로 관리자 계정 생성, 권한 변경, 계정 잠금/삭제, ACL 변경을 수행할 수 있다. 모든 보안 민감 작업은 감사 로그로 남아야 한다.

## User Stories & Acceptance Scenarios

### Story 1 - 관리자 KPI 확인 (Priority: P1)

> 관리자는 전체 관리자, 활성 관리자, 활성 ACL, 잠긴 계정 수를 한눈에 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 관리자가 `/admin/admins`에 진입했을 때, **When** 요약 조회가 성공하면, **Then** KPI 카드 4개가 표시된다.
2. **Given** 잠긴 계정이 1개 이상 있을 때, **When** KPI가 렌더링되면, **Then** 잠긴 계정 카드가 보안 확인 필요 상태로 표시된다.
3. **Given** 요약 조회가 실패했을 때, **When** 화면이 렌더링되면, **Then** KPI 영역에 실패 상태와 재시도 안내를 표시한다.

---

### Story 2 - 관리자 계정 목록 조회 및 필터링 (Priority: P1)

> 관리자는 관리자 계정 목록을 검색하고 권한/상태 기준으로 필터링할 수 있다.

**Acceptance Scenarios**:

1. **Given** 관리자 목록 조회가 성공했을 때, **When** 화면이 렌더링되면, **Then** 관리자 정보, 권한, 상태, 최근 접속, 관리 액션이 표시된다.
2. **Given** 이름, 이메일, 관리자 ID 검색어를 입력했을 때, **When** 검색 조건이 적용되면, **Then** 조건에 맞는 관리자만 표시된다.
3. **Given** 권한 필터를 선택했을 때, **When** 필터가 적용되면, **Then** 선택한 권한의 관리자만 표시된다.
4. **Given** 검색 결과가 없을 때, **When** 목록 영역이 렌더링되면, **Then** 검색 결과 없음 상태를 표시한다.

---

### Story 3 - 관리자 계정 생성 (Priority: P1)

> `MASTER` 관리자는 신규 관리자 계정을 생성할 수 있다.

**Acceptance Scenarios**:

1. **Given** `MASTER` 관리자가 계정 생성 버튼을 클릭했을 때, **When** 생성 화면이 열리면, **Then** 이메일, 임시 비밀번호, 이름, 권한 입력 필드가 표시된다.
2. **Given** 필수 입력값이 누락되었을 때, **When** 생성 요청을 시도하면, **Then** 생성 요청을 보내지 않고 필드 검증 메시지를 표시한다.
3. **Given** 유효한 입력값을 제출했을 때, **When** 생성 API가 성공하면, **Then** 관리자 목록과 감사 로그 API를 재조회해 계정 생성 이벤트를 표시한다.
4. **Given** 중복 이메일로 생성 요청했을 때, **When** API가 409를 반환하면, **Then** 중복 이메일 안내를 표시한다.

---

### Story 4 - 권한 변경 및 계정 잠금/삭제 (Priority: P1)

> `MASTER` 관리자는 관리자 권한을 변경하고 계정을 잠금/해제하거나 삭제할 수 있다.

**Acceptance Scenarios**:

1. **Given** 관리자 권한 select를 변경했을 때, **When** 권한 변경 API가 성공하면, **Then** 해당 관리자 역할과 scope가 갱신된다.
2. **Given** 활성 계정의 잠금 버튼을 클릭했을 때, **When** 상태 변경 API가 성공하면, **Then** 계정 상태가 `LOCKED`로 표시된다.
3. **Given** 잠긴 계정의 해제 버튼을 클릭했을 때, **When** 상태 변경 API가 성공하면, **Then** 계정 상태가 `ACTIVE`로 표시된다.
4. **Given** 삭제 버튼을 클릭했을 때, **When** 삭제 확인 후 API가 성공하면, **Then** 목록에서 해당 계정이 제거된다.
5. **Given** 마지막 `MASTER` 계정을 잠금 또는 삭제하려 할 때, **When** API가 409를 반환하면, **Then** 작업이 차단되었다는 안내를 표시한다.

---

### Story 5 - IP ACL 관리 (Priority: P1)

> `MASTER` 관리자는 관리자 페이지 접근을 허용할 IP 대역을 등록하고 활성 상태를 관리할 수 있다.

**Acceptance Scenarios**:

1. **Given** ACL 목록 조회가 성공했을 때, **When** ACL 영역이 렌더링되면, **Then** 라벨, CIDR, 설명, 위험도, 활성 상태, 수정 시각이 표시된다.
2. **Given** ACL 라벨과 CIDR을 입력했을 때, **When** 등록 API가 성공하면, **Then** ACL 목록과 감사 로그 API를 재조회해 등록 이벤트를 표시한다.
3. **Given** CIDR 형식이 잘못되었을 때, **When** 등록 요청을 시도하면, **Then** 필드 검증 메시지를 표시한다.
4. **Given** ACL 활성 상태를 변경했을 때, **When** API가 성공하면, **Then** 활성/비활성 표시와 수정 시각이 갱신된다.
5. **Given** ACL 삭제를 요청했을 때, **When** API가 성공하면, **Then** 목록에서 해당 ACL이 제거된다.

---

### Story 6 - 관리자 활동 로그 확인 (Priority: P2)

> 관리자는 관리자 계정 변경, ACL 변경, 보안 이벤트를 감사 로그로 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 감사 로그 목록 조회가 성공했을 때, **When** 로그 영역이 렌더링되면, **Then** 발생 시각, 행위자, IP, 액션, 대상, 심각도가 표시된다.
2. **Given** 로그가 없을 때, **When** 로그 영역이 렌더링되면, **Then** 최근 활동 없음 상태를 표시한다.

## Edge Cases

- 인증 토큰이 만료되면 관리자 로그인 페이지로 이동한다.
- `ROLE_ADMIN`이 아닌 사용자가 관리자 관리 API에 접근하면 권한 없음 안내를 표시한다.
- `MASTER` 권한이 아닌 관리자가 생성, 권한 변경, 삭제, ACL 변경을 시도하면 권한 없음 안내를 표시한다.
- 마지막 남은 `MASTER` 계정은 잠금/삭제할 수 없다.
- 관리자 생성 화면에서 Escape 키를 누르면 입력값을 초기화하고 닫는다.
- ACL 목록 삭제 후 현재 페이지가 비면 이전 페이지로 이동한다.
- 부분 조회 실패 시 실패한 섹션만 실패 상태를 표시한다.

## Requirements

### Functional Requirements

- **FR-001**: 관리자는 관리자 관리 KPI 4개를 확인할 수 있어야 한다.
- **FR-002**: 관리자는 관리자 계정 목록을 검색, 권한 필터, 상태 필터로 조회할 수 있어야 한다.
- **FR-003**: `MASTER` 관리자는 관리자 계정을 생성할 수 있어야 한다.
- **FR-004**: `MASTER` 관리자는 관리자 권한을 변경할 수 있어야 한다.
- **FR-005**: `MASTER` 관리자는 관리자 계정을 잠금/해제할 수 있어야 한다.
- **FR-006**: `MASTER` 관리자는 관리자 계정을 삭제할 수 있어야 한다.
- **FR-007**: `MASTER` 관리자는 IP ACL을 등록, 활성/비활성 전환, 삭제할 수 있어야 한다.
- **FR-008**: 관리자는 관리자 보안 감사 로그를 조회할 수 있어야 한다.
- **FR-009**: 프론트엔드는 변경 작업 성공 후 감사 로그 목록을 재조회하여 최신 이벤트를 표시해야 한다.
- **FR-010**: 화면은 로딩, 빈 데이터, 검증 실패, 권한 실패, 부분 실패, 전체 실패 상태를 구분해 표시해야 한다.
- **FR-011**: 프론트엔드는 `api-schema.md`의 `AdminAccount.role`/`scope` 등 서버 응답 권한 필드와 `401`/`403` API 실패 응답을 기준으로 인증 관리자 정보와 세부 역할을 판단해야 하며, 버튼 노출/비활성화 상태를 내부 추론이 아닌 해당 응답 필드와 명시적 오류 코드로 결정해야 한다.

### Key Entities

- **AdminAccount**: `id`, `name`, `email`, `role`, `scope`, `ip`, `createdAt`, `lastLoginAt`, `status`
- **AdminAclRule**: `id`, `label`, `cidr`, `note`, `enabled`, `riskLevel`, `updatedAt`
- **AdminAuditLog**: `id`, `occurredAt`, `actor`, `ip`, `action`, `target`, `severity`
- **AdminManagementSummary**: `totalAdminCount`, `activeAdminCount`, `activeAclCount`, `lockedAdminCount`

## Success Criteria

- **SC-001**: 관리자 목록 조회 후 1초 이내에 계정 목록과 KPI가 표시된다.
- **SC-002**: 계정 생성, 권한 변경, 잠금/해제, 삭제 후 목록과 로그가 갱신된다.
- **SC-003**: ACL 등록, 상태 변경, 삭제 후 ACL 목록과 로그가 갱신된다.
- **SC-004**: 권한 없는 사용자의 위험 작업은 실행되지 않는다.
- **SC-005**: 빈 데이터와 실패 상태에서도 레이아웃이 깨지지 않는다.

## Assumptions

- v1에서는 `MASTER` 권한만 관리자 계정과 ACL을 변경할 수 있다.
- `MASTER`는 백엔드 `ROLE_ADMIN` 권한 내 세부 역할이며, 일반 사용자 권한과 분리된다.
- 관리자 로그인/토큰 발급은 별도 인증 도메인에서 처리한다.
- 비밀번호 정책은 백엔드 검증 결과를 화면에 표시한다.
- 문서 참조 경로는 숫자 prefix 제거 후 구조를 기준으로 작성한다.
