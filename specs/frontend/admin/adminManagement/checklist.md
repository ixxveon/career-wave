# Checklist: 관리자 관리

**Feature Branch**: `feature/admin-management-api`
**Status**: Draft

## 브랜치 전략

- [x] Phase별 구현 브랜치가 정의되어 있다.
- [x] Phase 1 브랜치는 최신 `develop`을 기준으로 생성한다.
- [x] Phase 2 이후 브랜치는 직전 Phase 브랜치를 기준으로 생성한다.
- [x] 선행 Phase PR 병합 후 후속 Phase 브랜치의 rebase 또는 PR base 조정 기준이 명시되어 있다.

## 타입 및 API 계층

- [x] `frontend/src/admin/api/adminManagementApi.ts`가 생성되어 있다.
- [x] `AdminManagementSummary` 타입이 정의되고 export되어 있다.
- [x] `AdminAccount`, `AdminRole`, `AdminStatus` 타입이 정의되고 export되어 있다.
- [x] `AdminAclRule`, `AclRiskLevel` 타입이 정의되고 export되어 있다.
- [x] `AdminAuditLog`, `AuditSeverity` 타입이 정의되고 export되어 있다.
- [x] 관리자 계정 API 함수가 작성되어 있다.
- [x] ACL API 함수가 작성되어 있다.
- [x] 감사 로그 API 함수가 작성되어 있다.
- [x] `ApiResponse<T>` 래퍼 응답이 처리되어 있다.
- [x] API 실패 시 화면에 표시할 에러 메시지 매핑이 정의되어 있다.
- [x] JWT 인증 만료, `ROLE_ADMIN` 권한 없음, `MASTER` 세부 역할 부족 에러 메시지가 구분되어 있다.

## 계정/RBAC 연동

- [x] KPI summary는 API 응답 기반으로 렌더링된다.
- [x] 관리자 목록은 API 응답 기반으로 렌더링된다.
- [x] 검색어, 권한 필터, 상태 필터는 API query parameter와 연결되어 있다.
- [x] 관리자 계정 생성은 생성 API와 연결되어 있다.
- [x] 권한 변경은 권한 변경 API와 연결되어 있다.
- [x] 잠금/해제는 상태 변경 API와 연결되어 있다.
- [x] 삭제는 삭제 API와 연결되어 있다.
- [x] 변경 성공 후 관리자 목록과 summary가 재조회된다.

## ACL 연동

- [ ] ACL 목록은 API 응답 기반으로 렌더링된다.
- [ ] ACL 등록은 등록 API와 연결되어 있다.
- [ ] ACL 활성/비활성 전환은 상태 변경 API와 연결되어 있다.
- [ ] ACL 삭제는 삭제 API와 연결되어 있다.
- [ ] CIDR 검증 실패 메시지가 표시된다.
- [ ] ACL 변경 성공 후 ACL 목록과 summary가 재조회된다.
- [ ] ACL 삭제 후 현재 페이지가 비면 이전 페이지로 보정된다.

## 감사 로그 및 상태 처리

- [ ] 감사 로그 목록은 API 응답 기반으로 렌더링된다.
- [ ] 행위자 필터는 감사 로그 query parameter와 연결되어 있다.
- [ ] 계정/ACL 변경 성공 후 감사 로그가 재조회된다.
- [ ] 초기 로딩 상태가 표시된다.
- [ ] 빈 계정 목록, 빈 ACL 목록, 빈 감사 로그 상태가 각각 표시된다.
- [ ] 부분 실패 시 실패 섹션만 오류 상태로 표시된다.
- [ ] 전체 실패 시 재시도 버튼과 오류 메시지가 표시된다.

## 권한 및 검증

- [ ] `ROLE_ADMIN` 권한이 아닌 경우 관리자 관리 화면 접근 또는 API 호출 실패 상태가 표시된다.
- [ ] `MASTER` 권한이 아닌 경우 계정 위험 작업 버튼이 숨겨지거나 비활성화된다.
- [ ] `MASTER` 권한이 아닌 경우 ACL 위험 작업 버튼이 숨겨지거나 비활성화된다.
- [ ] 마지막 `MASTER` 계정 잠금/삭제 요청이 차단된다.
- [ ] 관리자 생성 모달은 Escape 키로 닫히고 입력값이 초기화된다.
- [ ] 빈 데이터와 실패 상태에서 레이아웃이 깨지지 않는다.
- [ ] 키보드로 주요 버튼과 입력 필드에 접근할 수 있다.
