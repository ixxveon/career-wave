# Tasks: 관리자 종합 대시보드

> `plan.md`의 구현 Phase와 1:1로 대응한다.

## Phase 1 - 타입 및 API 계층

- [ ] `feature/admin-dashboard-spec` 브랜치를 기준으로 `feature/admin-dashboard-api` 브랜치를 생성한다.
- [ ] `frontend/src/admin/api/dashboardApi.ts`를 생성한다.
- [ ] `AdminDashboardSummary` 응답 타입을 정의하고 export한다.
- [ ] `DashboardKpi`, `DashboardAlert`, `DashboardActivity` 타입을 정의하고 export한다.
- [ ] `GET /api/admin/dashboard/summary` 호출 함수를 작성한다.
- [ ] `ApiResponse<AdminDashboardSummary>` 래퍼 응답을 처리한다.
- [ ] API 실패 시 화면에 표시할 에러 메시지 매핑을 작성한다.

## Phase 2 - 화면 데이터 연동

- [ ] `feature/admin-dashboard-api` 브랜치를 기준으로 `feature/admin-dashboard-data` 브랜치를 생성한다.
- [ ] `AdminDashboardPage.tsx`의 mock KPI 데이터를 API 응답 기반으로 교체한다.
- [ ] 주요 알림 목록을 API 응답 기반으로 교체한다.
- [ ] 주간 가입자 차트를 API 응답 기반으로 교체한다.
- [ ] 결제 비중 차트를 API 응답 기반으로 교체한다.
- [ ] 관리자 기능 카드의 값과 이동 경로를 API 응답 또는 라우트 상수와 연결한다.
- [ ] 시스템 상태와 최근 관리자 활동을 API 응답 기반으로 교체한다.
- [ ] TanStack Query를 서버 상태 조회에 우선 적용하고, 적용하지 않는 경우 사유를 남긴다.

## Phase 3 - 상태 처리

- [ ] `feature/admin-dashboard-data` 브랜치를 기준으로 `feature/admin-dashboard-state` 브랜치를 생성한다.
- [ ] 초기 로딩 상태를 구현한다.
- [ ] 전체 데이터가 비어 있을 때 빈 상태 메시지를 표시한다.
- [ ] 주요 알림이 없을 때 알림 없음 상태를 표시한다.
- [ ] 차트 데이터가 없을 때 빈 차트 상태를 표시한다.
- [ ] 일부 섹션 조회 실패 시 전체 화면을 막지 않고 해당 섹션에만 실패 상태를 표시한다.
- [ ] 전체 조회 실패 시 재시도 버튼과 오류 메시지를 표시한다.

## Phase 4 - 라우팅 및 권한

- [ ] `feature/admin-dashboard-state` 브랜치를 기준으로 `feature/admin-dashboard-route-auth` 브랜치를 생성한다.
- [ ] `AdminSidebar`의 관리자 라우트와 대시보드 카드 `targetPath`를 대조한다.
- [ ] 알림 이동 버튼의 `targetPath`가 실제 라우트와 일치하는지 검증한다.
- [ ] 존재하지 않는 `targetPath`는 버튼 비활성화로 처리한다.
- [ ] 관리자 권한별로 접근 가능한 카드와 알림만 표시하는 조건을 적용한다.
- [ ] 접근 불가 메뉴 클릭 시 권한 없음 안내를 표시한다.

## Phase 5 - 검증

- [ ] `feature/admin-dashboard-route-auth` 브랜치를 기준으로 `feature/admin-dashboard-verify` 브랜치를 생성한다.
- [ ] `/admin/dashboard` 진입 시 KPI 4개가 표시되는지 확인한다.
- [ ] 주요 알림 버튼이 올바른 관리자 페이지로 이동하는지 확인한다.
- [ ] 기능 카드 상세 보기 버튼이 올바른 관리자 페이지로 이동하는지 확인한다.
- [ ] API 빈 응답 상태에서 레이아웃이 깨지지 않는지 확인한다.
- [ ] API 실패 상태에서 재시도 또는 오류 메시지가 표시되는지 확인한다.
- [ ] 키보드로 이동 버튼에 접근 가능한지 확인한다.
