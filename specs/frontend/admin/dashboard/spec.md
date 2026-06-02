# Feature Specification: 관리자 종합 대시보드

**Feature Branch**: `feature/admin-dashboard-spec`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/Dashboard/AdminDashboardPage.tsx`

## Feature Overview

관리자 종합 대시보드는 관리자 로그인 후 운영 현황을 가장 먼저 확인하는 허브 화면이다. 핵심 KPI, 오늘 처리할 알림, 추이/비중 차트, 주요 관리 메뉴, 시스템 상태, 최근 관리자 활동을 한 화면에 배치해 운영자가 다음 행동을 빠르게 선택할 수 있게 한다.

## User Stories & Acceptance Scenarios

### Story 1 - 핵심 KPI 확인 (Priority: P1)

> 관리자는 오늘의 신규 가입자, 실시간 접속자, AI 면접 세션, 매출 현황을 빠르게 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 관리자가 `/admin/dashboard`에 진입했을 때, **When** 요약 데이터 조회가 성공하면, **Then** KPI 카드 4개가 제목, 값, 보조 설명, 아이콘과 함께 표시된다.
2. **Given** KPI 값이 전일 대비 증감 정보를 포함할 때, **When** 카드가 렌더링되면, **Then** 증감 설명이 카드 하단에 표시된다.
3. **Given** 특정 KPI 조회에 실패했을 때, **When** 나머지 데이터는 조회 가능하면, **Then** 실패한 KPI 카드만 오류 또는 미집계 상태로 표시한다.

---

### Story 2 - 주요 알림 확인 및 이동 (Priority: P1)

> 관리자는 오늘 처리해야 할 신고, 결제 실패, 고객 문의, AI 이상 징후를 확인하고 관련 관리 페이지로 이동할 수 있다.

**Acceptance Scenarios**:

1. **Given** 주요 알림이 존재할 때, **When** 대시보드가 렌더링되면, **Then** 알림별 레벨, 도메인, 메시지, 이동 버튼이 표시된다.
2. **Given** 관리자가 알림의 이동 버튼을 클릭했을 때, **When** `targetPath`가 존재하면, **Then** 해당 관리자 상세 페이지로 이동한다.
3. **Given** 주요 알림이 없을 때, **When** 알림 영역이 렌더링되면, **Then** 처리할 알림이 없다는 빈 상태를 표시한다.

---

### Story 3 - 추이 및 비중 차트 확인 (Priority: P2)

> 관리자는 가입자 추이와 결제 수단 비중을 시각적으로 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 주간 가입자 데이터가 있을 때, **When** 차트 영역이 렌더링되면, **Then** 요일별 막대와 값이 표시된다.
2. **Given** 결제 비중 데이터가 있을 때, **When** 도넛 차트 영역이 렌더링되면, **Then** 결제 수단별 비율과 범례가 표시된다.
3. **Given** 차트 데이터가 비어 있을 때, **When** 차트 영역이 렌더링되면, **Then** 빈 차트 상태와 데이터 없음 메시지를 표시한다.

---

### Story 4 - 주요 관리자 기능 진입 (Priority: P1)

> 관리자는 대시보드의 기능 카드에서 회원 관리, 신고 관리, 고객센터, 결제 및 정산, 서비스 통계, AI 매트릭스로 이동할 수 있다.

**Acceptance Scenarios**:

1. **Given** 기능 카드 목록이 표시될 때, **When** 관리자가 상세 보기 버튼을 클릭하면, **Then** 카드에 연결된 `targetPath`로 이동한다.
2. **Given** 관리자의 권한이 특정 메뉴에 접근할 수 없을 때, **When** 기능 카드가 렌더링되면, **Then** 해당 카드는 숨기거나 비활성화한다.
3. **Given** 사이드바 메뉴와 기능 카드가 같은 도메인을 가리킬 때, **When** 경로를 비교하면, **Then** 동일한 라우트 값을 사용한다.

---

### Story 5 - 시스템 상태와 최근 활동 확인 (Priority: P2)

> 관리자는 시스템 상태와 최근 관리자 활동을 확인해 운영 리스크를 파악할 수 있다.

**Acceptance Scenarios**:

1. **Given** 시스템 상태 데이터가 있을 때, **When** 상태 카드가 렌더링되면, **Then** AI API, WebSocket, CPU, 메모리 상태가 표시된다.
2. **Given** 최근 활동 로그가 있을 때, **When** 로그 항목을 클릭하면, **Then** 연결된 상세 관리 페이지로 이동한다.
3. **Given** 최근 활동 로그가 없을 때, **When** 로그 영역이 렌더링되면, **Then** 최근 활동이 없다는 빈 상태를 표시한다.

## Edge Cases

- 관리자 토큰이 만료된 상태에서 대시보드 API를 호출하면 로그인 페이지로 이동한다.
- 일부 도메인 집계만 실패하면 전체 화면을 막지 않고 해당 카드 또는 섹션에만 실패 상태를 표시한다.
- 알림의 `targetPath`가 현재 라우터에 없는 경로이면 버튼을 비활성화하고 이동하지 않는다.
- KPI 값이 0이어도 누락으로 취급하지 않고 정상 값으로 표시한다.
- 결제 비중 합계가 100이 아니면 표시 전 정규화하지 않고 서버 응답 오류로 처리한다.

## Requirements

### Functional Requirements

- **FR-001**: 관리자는 `/admin/dashboard`에서 핵심 KPI 4개를 확인할 수 있어야 한다.
- **FR-002**: 관리자는 주요 알림 목록에서 관련 관리 페이지로 이동할 수 있어야 한다.
- **FR-003**: 관리자는 주간 가입자 추이와 결제 수단 비중을 확인할 수 있어야 한다.
- **FR-004**: 관리자는 주요 관리자 기능 카드에서 각 관리 페이지로 이동할 수 있어야 한다.
- **FR-005**: 관리자는 시스템 상태와 최근 관리자 활동 로그를 확인할 수 있어야 한다.
- **FR-006**: 화면은 로딩, 빈 데이터, 부분 실패, 전체 실패 상태를 구분해 표시해야 한다.
- **FR-007**: 관리자의 권한에 따라 접근 가능한 메뉴와 지표만 표시해야 한다.

### Key Entities

- **AdminDashboardSummary**: `baseDateTime`, `kpis`, `alerts`, `weeklySignups`, `paymentRatio`, `serviceCards`, `systemStatus`, `recentActivities`
- **DashboardKpi**: `key`, `title`, `value`, `unit`, `deltaText`, `severity`, `targetPath`
- **DashboardAlert**: `id`, `level`, `domain`, `title`, `message`, `targetPath`, `createdAt`
- **DashboardActivity**: `id`, `occurredAt`, `adminId`, `message`, `targetPath`

## Success Criteria

- **SC-001**: 대시보드 초기 요약 API 응답 후 1초 이내에 핵심 KPI와 주요 알림이 표시된다.
- **SC-002**: 각 이동 버튼 클릭 시 올바른 관리자 라우트로 이동한다.
- **SC-003**: API 부분 실패 시 사용자가 어떤 섹션이 실패했는지 확인할 수 있다.
- **SC-004**: 빈 데이터 상태에서도 레이아웃이 깨지지 않는다.

## Assumptions

- v1에서는 단일 요약 API로 대시보드 초기 데이터를 조회한다.
- 상세 처리는 각 도메인 페이지에서 담당한다.
- 문서 참조 경로는 숫자 prefix 제거 후 구조를 기준으로 작성한다.
