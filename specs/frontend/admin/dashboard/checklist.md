# Checklist: 관리자 종합 대시보드

**Feature Branch**: `feature/admin-dashboard-spec`
**Status**: Draft

## 브랜치 전략

- [ ] Phase별 구현 브랜치가 정의되어 있다.
- [ ] Phase 1 브랜치는 `feature/admin-dashboard-spec`을 기준으로 생성한다.
- [ ] Phase 2 이후 브랜치는 직전 Phase 브랜치를 기준으로 생성한다.
- [ ] 선행 Phase PR 병합 후 후속 Phase 브랜치의 rebase 또는 PR base 조정 기준이 명시되어 있다.

## 타입 및 API 계층

- [ ] `frontend/src/admin/api/dashboardApi.ts`가 생성되어 있다.
- [ ] `AdminDashboardSummary` 응답 타입이 정의되고 export되어 있다.
- [ ] `DashboardKpi`, `DashboardAlert`, `DashboardActivity` 타입이 정의되고 export되어 있다.
- [ ] `GET /api/admin/dashboard/summary` 호출 함수가 작성되어 있다.
- [ ] `ApiResponse<AdminDashboardSummary>` 래퍼 응답이 처리되어 있다.
- [ ] API 실패 시 화면에 표시할 에러 메시지 매핑이 정의되어 있다.

## 화면 데이터 연동

- [ ] KPI 카드는 mock 데이터가 아니라 API 응답 기반으로 렌더링된다.
- [ ] 주요 알림 목록은 API 응답 기반으로 렌더링된다.
- [ ] 주간 가입자 차트는 API 응답 기반으로 렌더링된다.
- [ ] 결제 비중 차트는 API 응답 기반으로 렌더링된다.
- [ ] 관리자 기능 카드의 값과 이동 경로는 API 응답 또는 라우트 상수와 연결되어 있다.
- [ ] 시스템 상태는 API 응답 기반으로 렌더링된다.
- [ ] 최근 관리자 활동은 API 응답 기반으로 렌더링된다.
- [ ] 서버 상태 조회에는 TanStack Query가 우선 적용되어 있거나, 적용하지 않은 사유가 남아 있다.

## 상태 처리

- [ ] 초기 로딩 상태가 표시된다.
- [ ] 전체 데이터가 비어 있을 때 빈 상태 메시지가 표시된다.
- [ ] 주요 알림이 없을 때 알림 없음 상태가 표시된다.
- [ ] 차트 데이터가 없을 때 빈 차트 상태가 표시된다.
- [ ] 일부 섹션 조회 실패 시 전체 화면이 막히지 않고 해당 섹션에만 실패 상태가 표시된다.
- [ ] 전체 조회 실패 시 재시도 버튼과 오류 메시지가 표시된다.

## 라우팅 및 권한

- [ ] `AdminSidebar`의 관리자 라우트와 대시보드 카드 `targetPath`가 일치한다.
- [ ] 알림 이동 버튼의 `targetPath`가 실제 라우트와 일치한다.
- [ ] 존재하지 않는 `targetPath`는 버튼 비활성화로 처리된다.
- [ ] 관리자 권한별로 접근 가능한 카드와 알림만 표시된다.
- [ ] 접근 불가 메뉴 클릭 시 권한 없음 안내가 표시된다.

## 최종 검증

- [ ] `/admin/dashboard` 진입 시 KPI 4개가 표시된다.
- [ ] 주요 알림 버튼이 올바른 관리자 페이지로 이동한다.
- [ ] 기능 카드 상세 보기 버튼이 올바른 관리자 페이지로 이동한다.
- [ ] API 빈 응답 상태에서 레이아웃이 깨지지 않는다.
- [ ] API 실패 상태에서 재시도 또는 오류 메시지가 표시된다.
- [ ] 키보드로 이동 버튼에 접근할 수 있다.
