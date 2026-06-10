# Plan: 관리자 종합 대시보드

**Feature Branch**: `feature/admin-dashboard-spec`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/Dashboard/AdminDashboardPage.tsx`

## Summary

관리자 종합 대시보드는 운영자가 관리자 서비스에 진입했을 때 핵심 지표와 처리 항목을 한눈에 확인하는 허브 화면이다. 기존 mock 기반 화면을 API 계약 기반으로 전환하고, 각 도메인 상세 페이지로 이동하는 흐름을 명확히 한다.

## Technical Context

- React + TypeScript 기반 관리자 프론트엔드
- 라우트: `/admin/dashboard`
- 페이지: `frontend/src/admin/pages/Dashboard/AdminDashboardPage.tsx`
- 레이아웃: `frontend/src/admin/layouts/AdminLayout.tsx`
- 사이드바: `frontend/src/admin/components/AdminSidebar.tsx`
- 스타일: `frontend/src/admin/styles/admin.css`
- 아이콘: `lucide-react`
- API 계약: `specs/frontend/admin/dashboard/api-schema.md`
- API 모듈 예정 위치: `frontend/src/admin/api/dashboardApi.ts`
- 타입 정의 위치: `frontend/src/admin/api/dashboardApi.ts`에서 응답 타입을 함께 export
- 서버 상태 관리: TanStack Query 우선 검토

## Project Structure

```text
frontend/src/admin/pages/Dashboard/
└── AdminDashboardPage.tsx

frontend/src/admin/api/
└── dashboardApi.ts

specs/frontend/admin/dashboard/
├── constitution.md
├── api-schema.md
├── spec.md
├── plan.md
├── tasks.md
└── checklist.md
```

> 실제 repository 반영 전까지 스펙 파일은 현재 대시보드 스펙 폴더에 둔다.

## Branch Strategy

관리자 종합 대시보드 구현은 Phase별 stacked branch로 진행한다. 각 Phase 브랜치는 직전 Phase 브랜치를 원본으로 생성하며, 선행 Phase가 병합되면 후속 Phase 브랜치는 최신 기준으로 rebase 또는 base 변경을 수행한다.

| Phase | Branch | Base |
|---|---|---|
| Phase 1 - 타입 및 API 계층 | `feature/admin-dashboard-api` | `develop` |
| Phase 2 - 화면 데이터 연동 | `feature/admin-dashboard-data` | `feature/admin-dashboard-api` |
| Phase 3 - 상태 처리 | `feature/admin-dashboard-state` | `feature/admin-dashboard-data` |
| Phase 4 - 라우팅 및 권한 | `feature/admin-dashboard-route-auth` | `feature/admin-dashboard-state` |
| Phase 5 - 검증 | `feature/admin-dashboard-verify` | `feature/admin-dashboard-route-auth` |

PR은 각 브랜치의 base 관계를 유지해 생성한다. 선행 Phase PR이 `develop`에 병합되면 다음 Phase PR은 `develop` 기준으로 rebase하거나 PR base를 조정한다.

## Phases

### Phase 1 - 타입 및 API 계층

- [ ] 최신 `develop` 브랜치를 기준으로 `feature/admin-dashboard-api` 브랜치를 생성한다.
- [ ] `dashboardApi.ts`를 생성하고 대시보드 요약 조회 함수를 작성한다.
- [ ] `AdminDashboardSummary`, `DashboardKpi`, `DashboardAlert`, `DashboardActivity` 타입을 정의한다.
- [ ] `ApiResponse<T>` 래퍼 응답과 API 실패 메시지 매핑을 처리한다.

### Phase 2 - 화면 데이터 연동

- [ ] `feature/admin-dashboard-api` 브랜치를 기준으로 `feature/admin-dashboard-data` 브랜치를 생성한다.
- [ ] `AdminDashboardPage.tsx`의 mock 상수를 API 응답 기반 렌더링으로 전환한다.
- [ ] KPI, 알림, 차트, 기능 카드, 시스템 상태, 최근 활동 섹션을 응답 데이터에 연결한다.
- [ ] 서버 상태 조회에는 TanStack Query를 우선 적용하고, 적용하지 않는 경우 사유를 남긴다.

### Phase 3 - 상태 처리

- [ ] `feature/admin-dashboard-data` 브랜치를 기준으로 `feature/admin-dashboard-state` 브랜치를 생성한다.
- [ ] 초기 로딩 상태를 구현한다.
- [ ] 전체 빈 데이터, 알림 없음, 차트 없음 상태를 구분해 표시한다.
- [ ] 부분 실패와 전체 실패 상태를 구분해 표시한다.

### Phase 4 - 라우팅 및 권한

- [ ] `feature/admin-dashboard-state` 브랜치를 기준으로 `feature/admin-dashboard-route-auth` 브랜치를 생성한다.
- [ ] 기능 카드와 알림 버튼의 `targetPath`가 관리자 라우트와 일치하는지 검증한다.
- [ ] 관리자 권한별 노출/비활성화 정책을 적용한다.
- [ ] 잘못된 `targetPath`가 들어온 경우 이동을 차단한다.

### Phase 5 - 검증

- [ ] `feature/admin-dashboard-route-auth` 브랜치를 기준으로 `feature/admin-dashboard-verify` 브랜치를 생성한다.
- [ ] 대시보드 렌더링을 수동 검증한다.
- [ ] 각 이동 버튼의 라우팅을 검증한다.
- [ ] API 실패 및 빈 데이터 상태를 검증한다.
- [ ] 접근성 기본 항목을 검증한다.
