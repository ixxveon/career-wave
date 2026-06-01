# Constitution: 관리자 종합 대시보드

**Feature Branch**: `feature/admin-dashboard-spec`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/Dashboard/AdminDashboardPage.tsx`

## 목적

관리자 종합 대시보드는 관리자 서비스 진입 후 가장 먼저 확인하는 운영 현황 화면이다. 회원, 신고, 고객센터, 결제, 통계, AI 매트릭스, 스크래핑, 감사 로그의 핵심 상태를 한 화면에서 요약하고, 긴급 처리 항목을 각 상세 관리 페이지로 연결한다.

## 범위

- 포함: KPI 카드, 주요 알림, 주간 가입자 추이, 결제 비중, 관리자 기능 카드, 시스템 상태, 최근 관리자 활동
- 포함: 각 카드와 알림의 관리자 상세 페이지 이동 규칙
- 제외: 각 도메인의 상세 목록/처리 기능 구현
- 제외: AI 매트릭스, 스크래핑, 관리자 관리의 세부 정책

## 참조 원칙

- 문서 참조 시 숫자 prefix를 제거한 경로를 사용한다.
  - 예: `specs/frontend/admin/dashboard`
  - 예: `specs/frontend/admin/member`
  - 예: `specs/frontend/admin/ai-metrics`
  - 예: `specs/frontend/admin/scraping`
- 실제 repository 반영 전까지 파일은 현재 대시보드 스펙 폴더에 둔다.

## 불변 규칙

- 대시보드는 운영 현황을 요약하는 화면이며, 도메인별 데이터 수정은 각 관리 페이지에서 수행한다.
- 긴급 알림은 처리 대상과 이동 경로를 반드시 함께 제공한다.
- KPI 수치는 동일 기준 시점에서 집계되어야 하며, 서로 다른 집계 시점의 값을 한 카드 그룹에 섞지 않는다.
- API 연동 후에도 UI는 빈 데이터, 지연, 부분 실패 상태를 표시해야 한다.
- 관리자의 권한에 따라 접근 불가 메뉴 또는 지표는 노출하지 않거나 비활성화한다.

## 연동 계약

- 라우트: `/admin/dashboard`
- 레이아웃: `frontend/src/admin/layouts/AdminLayout.tsx`
- 사이드바: `frontend/src/admin/components/AdminSidebar.tsx`
- 화면: `frontend/src/admin/pages/Dashboard/AdminDashboardPage.tsx`
- 공통 스타일: `frontend/src/admin/styles/admin.css`
- API 계약: `specs/frontend/admin/dashboard/api-schema.md`

## 금지 패턴

- 페이지 컴포넌트에서 여러 도메인의 HTTP 호출을 직접 흩뿌리지 않는다.
- mock 데이터 상수와 API 응답 타입을 같은 이름으로 혼용하지 않는다.
- 알림 클릭 이동 경로를 문자열로 중복 선언하지 않고, 라우트 상수 또는 도메인 카드 정의와 일관되게 관리한다.
- 집계 실패를 0으로 조용히 대체하지 않는다.
