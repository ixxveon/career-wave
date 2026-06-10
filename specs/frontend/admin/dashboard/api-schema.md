# API Schema: 관리자 종합 대시보드

**Feature Branch**: `feature/admin-dashboard-spec`
**Status**: Draft
**공통 응답 래퍼**: `ApiResponse<T>`

## Permissions

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`, `USER`를 사용한다. Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`, `ROLE_USER`로 매핑한다.

| Method | Path | Allowed Roles |
|---|---|---|
| GET | `/api/v1/admin/dashboard/summary` | `MASTER`, `BACKEND`, `CS` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/dashboard/summary` | 종합 대시보드 초기 표시 데이터 조회 |

## Query Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `range` | `string` | N | 집계 범위. 기본값 `TODAY`, 허용값 `TODAY`, `7D`, `30D` |

## Response: `ApiResponse<AdminDashboardSummary>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 대시보드 요약 조회에 성공했습니다.",
  "data": {
    "baseDateTime": "2026-06-01T09:00:00+09:00",
    "kpis": [
      {
        "key": "TODAY_NEW_MEMBERS",
        "title": "오늘 신규 가입자",
        "value": 128,
        "unit": "명",
        "deltaText": "어제 대비 +14명",
        "severity": "NORMAL",
        "targetPath": "/admin/members"
      }
    ],
    "alerts": [
      {
        "id": 1,
        "level": "URGENT",
        "domain": "REPORT",
        "title": "신고 처리 대기",
        "message": "게시글 신고 3건 처리 대기 중",
        "targetPath": "/admin/reports",
        "createdAt": "2026-06-01T08:40:00+09:00"
      }
    ],
    "weeklySignups": [
      { "label": "월", "count": 70 }
    ],
    "paymentRatio": [
      { "method": "CARD", "label": "카드", "ratio": 62 }
    ],
    "serviceCards": [
      {
        "key": "MEMBER",
        "title": "회원 관리",
        "description": "가입자, 구독 상태, 권한, 정지 회원을 관리합니다.",
        "summaryText": "신규 128명",
        "targetPath": "/admin/members"
      }
    ],
    "systemStatus": [
      {
        "key": "AI_API",
        "label": "AI API",
        "status": "NORMAL",
        "valueText": "정상"
      }
    ],
    "recentActivities": [
      {
        "id": 1,
        "occurredAt": "2026-06-01T09:12:00+09:00",
        "adminId": "cs_admin",
        "message": "환불 요청 1건 확인",
        "targetPath": "/admin/payments"
      }
    ]
  }
}
```

## Types

### `AdminDashboardSummary`

| Field | Type | Required | Description |
|---|---|---|---|
| `baseDateTime` | `string` | Y | 대시보드 집계 기준 시각 |
| `kpis` | `DashboardKpi[]` | Y | 핵심 KPI 카드 목록. v1 기준 4개 고정 |
| `alerts` | `DashboardAlert[]` | Y | 주요 처리 알림 목록 |
| `weeklySignups` | `WeeklySignup[]` | Y | 주간 가입자 추이 |
| `paymentRatio` | `PaymentRatio[]` | Y | 결제 수단별 비중 |
| `serviceCards` | `DashboardServiceCard[]` | Y | 관리자 기능 카드 목록 |
| `systemStatus` | `DashboardSystemStatus[]` | Y | 시스템 상태 목록 |
| `recentActivities` | `DashboardActivity[]` | Y | 최근 관리자 활동 목록 |

### `DashboardKpiKey`

| Value | Description |
|---|---|
| `TODAY_NEW_MEMBERS` | 오늘 신규 가입자 |
| `REALTIME_ACTIVE_USERS` | 실시간 접속자 |
| `AI_INTERVIEW_SESSIONS` | AI 면접 세션 |
| `TODAY_REVENUE` | 오늘 매출 |

### `DashboardSeverity`

| Value | Description |
|---|---|
| `NORMAL` | 정상 |
| `WARNING` | 주의 |
| `CRITICAL` | 긴급 |

### `DashboardAlertLevel`

| Value | Description |
|---|---|
| `URGENT` | 즉시 처리가 필요한 알림 |
| `WARNING` | 확인이 필요한 주의 알림 |
| `NORMAL` | 일반 알림 |

### `DashboardDomain`

| Value | Target |
|---|---|
| `ADMIN` | `/admin/admins` |
| `MEMBER` | `/admin/members` |
| `REPORT` | `/admin/reports` |
| `CS` | `/admin/cs` |
| `PAYMENT` | `/admin/payments` |
| `STATISTICS` | `/admin/stats` |
| `AI_METRICS` | `/admin/ai` |
| `SCRAPING` | `/admin/scraping` |
| `AUDIT_LOG` | `/admin/log` |

### `DashboardSystemStatus`

| Value | Description |
|---|---|
| `NORMAL` | 정상 |
| `WARNING` | 주의 |
| `CRITICAL` | 장애 또는 즉시 확인 필요 |

## Response Rules

- `kpis`는 v1 기준 `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` 4개를 반환한다.
- `paymentRatio.ratio` 합계는 100이어야 한다.
- `targetPath`는 `DashboardDomain`의 Target 값 중 하나여야 한다.
- 데이터가 없는 섹션은 `null` 대신 빈 배열을 반환한다.
- 집계 기준 시각은 `baseDateTime`으로 명시한다.

## Error Cases

| statusCode | message | UI Handling |
|---|---|---|
| 401 | 인증이 필요합니다. | 관리자 로그인 페이지로 이동 |
| 403 | 접근 권한이 없습니다. | 권한 없음 안내 표시 |
| 500 | 대시보드 요약 조회에 실패했습니다. | 재시도 버튼과 오류 메시지 표시 |
