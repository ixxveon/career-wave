# Plan: 관리자 관리

**Feature Branch**: `feature/admin-management-spec`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/AdminManagement/AdminManagementPage.tsx`

## Summary

관리자 관리는 mock 기반 관리자 계정, IP ACL, 감사 로그 화면을 API 계약 기반으로 전환하고, `MASTER` 권한 중심의 위험 작업 제어와 감사 로그 기록 흐름을 명확히 하는 작업이다.

## Technical Context

- React + TypeScript 기반 관리자 프론트엔드
- 라우트: `/admin/admins`
- 페이지: `frontend/src/admin/pages/AdminManagement/AdminManagementPage.tsx`
- 레이아웃: `frontend/src/admin/layouts/AdminLayout.tsx`
- 사이드바: `frontend/src/admin/components/AdminSidebar.tsx`
- 공통 스타일: `frontend/src/admin/styles/admin.css`
- 공통 페이지네이션: `frontend/src/admin/components/MiniPagination.tsx`
- 아이콘: `lucide-react`
- API 계약: `specs/frontend/admin/adminManagement/api-schema.md`
- API 모듈 예정 위치: `frontend/src/admin/api/adminManagementApi.ts`
- 타입 정의 위치: `frontend/src/admin/api/adminManagementApi.ts`에서 응답 타입을 함께 export
- 서버 상태 관리: TanStack Query 우선 적용

## Project Structure

```text
frontend/src/admin/pages/AdminManagement/
└── AdminManagementPage.tsx

frontend/src/admin/api/
└── adminManagementApi.ts

specs/frontend/admin/adminManagement/
├── constitution.md
├── api-schema.md
├── spec.md
├── plan.md
├── tasks.md
└── checklist.md
```

## Branch Strategy

`CONTRIBUTION.md`의 기본 브랜치 원칙은 최신 `develop` 기준 분기다. 다만 관리자 관리 구현은 Phase 간 의존성이 높으므로, 본 스펙에서는 팀 합의가 필요한 stacked branch 예외 흐름으로 진행한다. 각 Phase 브랜치는 직전 Phase 브랜치를 원본으로 생성하며, 선행 Phase가 병합되면 후속 Phase 브랜치는 최신 기준으로 rebase 또는 base 변경을 수행한다.

| Phase | Branch | Base |
|---|---|---|
| Phase 1 - 타입 및 API 계층 | `feature/admin-management-api` | `feature/admin-management-spec` |
| Phase 2 - 계정/RBAC 연동 | `feature/admin-management-account` | `feature/admin-management-api` |
| Phase 3 - ACL 연동 | `feature/admin-management-acl` | `feature/admin-management-account` |
| Phase 4 - 감사 로그 및 상태 처리 | `feature/admin-management-audit-state` | `feature/admin-management-acl` |
| Phase 5 - 권한 및 검증 | `feature/admin-management-auth-verify` | `feature/admin-management-audit-state` |

PR은 각 브랜치의 base 관계를 유지해 생성한다. 선행 Phase PR이 `develop`에 병합되면 다음 Phase PR은 `develop` 기준으로 rebase하거나 PR base를 조정한다.

## Phases

### Phase 1 - 타입 및 API 계층

- [ ] `feature/admin-management-spec` 브랜치를 기준으로 `feature/admin-management-api` 브랜치를 생성한다.
- [ ] `adminManagementApi.ts`를 생성한다.
- [ ] 관리자 계정, ACL, 감사 로그, summary 응답 타입을 정의한다.
- [ ] 관리자 관리 API 호출 함수를 작성한다.
- [ ] `ApiResponse<T>` 래퍼 응답과 에러 메시지 매핑을 처리한다.
- [ ] JWT 인증 만료, endpoint별 권한 없음, `MASTER` 세부 역할 부족 에러 메시지를 분리한다.

### Phase 2 - 계정/RBAC 연동

- [ ] `feature/admin-management-api` 브랜치를 기준으로 `feature/admin-management-account` 브랜치를 생성한다.
- [ ] 관리자 KPI와 관리자 목록을 API 응답 기반으로 전환한다.
- [ ] 검색, 권한 필터, 상태 필터를 API query parameter와 연결한다.
- [ ] 관리자 계정 생성, 권한 변경, 잠금/해제, 삭제 API를 연결한다.
- [ ] 성공 후 목록과 summary를 재조회한다.

### Phase 3 - ACL 연동

- [ ] `feature/admin-management-account` 브랜치를 기준으로 `feature/admin-management-acl` 브랜치를 생성한다.
- [ ] ACL 목록을 API 응답 기반으로 전환한다.
- [ ] ACL 등록, 활성/비활성 전환, 삭제 API를 연결한다.
- [ ] CIDR 검증 실패 메시지를 화면에 표시한다.
- [ ] ACL 변경 후 목록과 summary를 재조회한다.

### Phase 4 - 감사 로그 및 상태 처리

- [ ] `feature/admin-management-acl` 브랜치를 기준으로 `feature/admin-management-audit-state` 브랜치를 생성한다.
- [ ] 감사 로그 목록과 행위자 필터를 API 응답 기반으로 전환한다.
- [ ] 계정/ACL 변경 성공 후 감사 로그를 재조회한다.
- [ ] 로딩, 빈 데이터, 검증 실패, 부분 실패, 전체 실패 상태를 구현한다.

### Phase 5 - 권한 및 검증

- [ ] `feature/admin-management-audit-state` 브랜치를 기준으로 `feature/admin-management-auth-verify` 브랜치를 생성한다.
- [ ] endpoint별 권한이 아닌 경우 관리자 관리 화면 접근 또는 API 호출 실패 상태를 검증한다.
- [ ] `MASTER` 권한이 아닌 경우 위험 작업 버튼을 숨기거나 비활성화한다.
- [ ] 마지막 `MASTER` 계정 잠금/삭제 차단 상태를 검증한다.
- [ ] 키보드 접근성, 모달 닫기, 라우팅, API 실패 상태를 검증한다.
