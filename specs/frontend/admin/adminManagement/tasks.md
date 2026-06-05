# Tasks: 관리자 관리

> `plan.md`의 구현 Phase와 1:1로 대응한다.

## Phase 1 - 타입 및 API 계층

- [x] 최신 `develop` 브랜치를 기준으로 `feature/admin-management-api` 브랜치를 생성한다.
- [x] `frontend/src/admin/api/adminManagementApi.ts`를 생성한다.
- [x] `AdminManagementSummary` 타입을 정의하고 export한다.
- [x] `AdminAccount`, `AdminRole`, `AdminStatus` 타입을 정의하고 export한다.
- [x] `AdminAclRule`, `AclRiskLevel` 타입을 정의하고 export한다.
- [x] `AdminAuditLog`, `AuditSeverity` 타입을 정의하고 export한다.
- [x] 관리자 계정 조회/생성/권한 변경/상태 변경/삭제 API 함수를 작성한다.
- [x] ACL 조회/등록/활성 전환/삭제 API 함수를 작성한다.
- [x] 감사 로그 조회 API 함수를 작성한다.
- [x] `ApiResponse<T>` 래퍼 응답과 에러 메시지 매핑을 처리한다.
- [x] JWT 인증 만료, `ROLE_ADMIN` 권한 없음, `MASTER` 세부 역할 부족 에러 메시지를 분리한다.

## Phase 2 - 계정/RBAC 연동

- [x] `feature/admin-management-api` 브랜치를 기준으로 `feature/admin-management-account` 브랜치를 생성한다.
- [x] KPI summary를 API 응답 기반으로 교체한다.
- [x] 관리자 목록을 API 응답 기반으로 교체한다.
- [x] 검색어, 권한 필터, 상태 필터를 API query parameter와 연결한다.
- [x] 관리자 계정 생성 모달을 생성 API와 연결한다.
- [x] 권한 변경 select를 권한 변경 API와 연결한다.
- [x] 잠금/해제 버튼을 상태 변경 API와 연결한다.
- [x] 삭제 버튼을 삭제 API와 연결한다.
- [x] 변경 성공 후 관리자 목록과 summary를 재조회한다.

## Phase 3 - ACL 연동

- [x] `feature/admin-management-account` 브랜치를 기준으로 `feature/admin-management-acl` 브랜치를 생성한다.
- [x] ACL 목록을 API 응답 기반으로 교체한다.
- [x] ACL 등록 폼을 등록 API와 연결한다.
- [x] ACL 활성/비활성 버튼을 상태 변경 API와 연결한다.
- [x] ACL 삭제 버튼을 삭제 API와 연결한다.
- [x] CIDR 형식 검증 실패 메시지를 표시한다.
- [x] ACL 변경 성공 후 ACL 목록과 summary를 재조회한다.
- [x] ACL 삭제 후 현재 페이지가 비면 이전 페이지로 보정한다.

## Phase 4 - 감사 로그 및 상태 처리

- [x] `feature/admin-management-acl` 브랜치를 기준으로 `feature/admin-management-audit-state` 브랜치를 생성한다.
- [x] 감사 로그 목록을 API 응답 기반으로 교체한다.
- [x] 계정/ACL 변경 성공 후 감사 로그를 재조회한다.
- [x] 초기 로딩 상태를 구현한다.
- [x] 빈 계정 목록, 빈 ACL 목록, 빈 감사 로그 상태를 각각 표시한다.
- [x] 부분 실패 시 실패 섹션만 오류 상태로 표시한다.
- [x] 전체 실패 시 재시도 버튼과 오류 메시지를 표시한다.

## Phase 5 - 권한 및 검증

- [ ] `feature/admin-management-audit-state` 브랜치를 기준으로 `feature/admin-management-auth-verify` 브랜치를 생성한다.
- [ ] `ROLE_ADMIN` 권한이 아닌 경우 관리자 관리 화면 접근 또는 API 호출 실패 상태를 검증한다.
- [ ] `MASTER` 권한이 아닌 경우 계정 생성/변경/삭제 버튼을 숨기거나 비활성화한다.
- [ ] `MASTER` 권한이 아닌 경우 ACL 등록/변경/삭제 버튼을 숨기거나 비활성화한다.
- [ ] 마지막 `MASTER` 계정 잠금/삭제 요청이 차단되는지 확인한다.
- [ ] 관리자 생성 모달에서 Escape 키로 닫기와 입력 초기화가 동작하는지 확인한다.
- [ ] 계정/ACL/로그 영역의 빈 데이터와 실패 상태에서 레이아웃이 깨지지 않는지 확인한다.
- [ ] 키보드로 주요 버튼과 입력 필드에 접근 가능한지 확인한다.
