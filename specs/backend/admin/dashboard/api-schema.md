# API Schema: dashboard

> 백엔드와 프론트엔드 간 `dashboard` 도메인 API 계약 문서다.
> 이 문서는 기능 설명이 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 모든 `page` Query Parameter는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환에서만 `page - 1`을 적용한다.
- `from`, `to`는 ISO 8601 UTC 문자열 규칙을 사용하지만, 본 도메인 endpoint에는 적용 대상이 없다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서의 ErrorCode 표에는 `dashboard` 전용 코드가 아니라, 실제 본 endpoint에서 사용하는 공통 ErrorCode만 최소 범위로 작성한다.

### 권한 표기

- 문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`를 사용한다.
- Spring Security에서는 세부 역할 `MASTER`, `BACKEND`, `CS`를 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑한다.
- 대시보드 요약 조회 API의 실제 접근 조건은 관리자 인증(`ROLE_ADMIN`) + 세부 역할 `MASTER` 또는 `BACKEND` 또는 `CS`다.

### Pagination 규칙

- 목록 조회 API만 `page`, `size`를 사용한다.
- 상세 조회 API는 `page`, `size`를 사용하지 않는다.
- 생성/수정/삭제 API는 `page`, `size`를 사용하지 않는다.

### 공통 성공 응답 예시

```json
{
  "success": true,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 공통 실패 응답 예시

```json
{
  "success": false,
  "statusCode": 400,
  "message": "유효하지 않은 요청입니다.",
  "code": "BAD_REQUEST",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | ERD CHECK 제약 또는 계약 기준 |
|---|---|---|
| `DashboardRangeType` | `TODAY`, `7D`, `30D` | 대시보드 기간 집계 계약 |
| `DashboardKpiKeyType` | `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` | 관리자 대시보드 KPI 계약 |
| `DashboardSeverityType` | `NORMAL`, `WARNING`, `CRITICAL` | 대시보드 표시 계약 |
| `DashboardAlertLevelType` | `URGENT`, `WARNING`, `NORMAL` | 대시보드 표시 계약 |
| `DashboardDomainType` | `ADMIN`, `MEMBER`, `REPORT`, `CS`, `PAYMENT`, `STATISTICS`, `AI_METRICS`, `SCRAPING`, `AUDIT_LOG` | 관리자 라우팅 계약 |
| `DashboardSystemStatusType` | `NORMAL`, `WARNING`, `CRITICAL` | 대시보드 표시 계약 |
| `DashboardPaymentMethod` | `CARD` | 결제 비율 섹션 계약 |

---

## 3. Query Parameter -> ERD 컬럼 매핑

### GET /api/v1/admin/dashboard/summary

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `range` | `TODAY \| 7D \| 30D` | 다중 집계 기준 컬럼 | 관리자 대시보드 집계 범위 |

### range 적용 대상 컬럼

> 본 endpoint는 단일 테이블 조회가 아니라 관리자 도메인 전반의 집계 응답이다.
> 따라서 `range`는 아래 시간 기준 컬럼들에 공통 집계 윈도우로 적용된다.

| 집계 영역 | ERD 기준 컬럼 |
|---|---|
| 관리자 계정 관련 | `admins.created_at`, `admins.last_login_at` |
| 감사 로그 관련 | `audit_logs.created_at` |
| AI 사용량 관련 | `ai_usage_logs.created_at` |
| RAG 문서 관련 | `rag_documents.created_at`, `rag_documents.updated_at` |
| 스크래핑 관련 | `scraping_logs.executed_at`, `scraping_pipelines.last_started_at`, `scraping_pipelines.last_success_at`, `scraping_pipelines.last_failed_at` |

> 사용자/결제/신고 등 다른 관리자 KPI가 포함되는 경우에도 동일한 `range` 규칙을 적용하며, 해당 지표는 각 도메인의 최종 ERD 기준 시각 컬럼으로 집계한다.

---

## 4. 종합 대시보드 API

### 4.1 GET /api/v1/admin/dashboard/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/dashboard/summary`
- **Auth**: `ROLE_ADMIN` + (`MASTER` or `BACKEND` or `CS`)

#### Query Parameter

- Request DTO: `DashboardDTO.SummaryRequest`

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `range` | `TODAY \| 7D \| 30D` | N | 다중 집계 기준 컬럼 | 집계 범위, 기본값 `TODAY` |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<DashboardDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "관리자 대시보드 요약 조회에 성공했습니다.",
  "data": {
    "baseDateTime": "2026-06-22T09:00:00Z",
    "range": "TODAY",
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
        "createdAt": "2026-06-22T08:40:00Z"
      }
    ],
    "weeklySignups": [
      {
        "label": "월",
        "count": 70
      }
    ],
    "paymentRatio": [
      {
        "method": "CARD",
        "label": "카드",
        "ratio": 62
      }
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
        "occurredAt": "2026-06-22T09:12:00Z",
        "adminId": "cs_admin",
        "message": "환불 요청 1건 확인",
        "targetPath": "/admin/payments"
      }
    ]
  }
}
```

#### Response Field Contract

##### `DashboardDTO.ResponseSummary`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `baseDateTime` | `string` | Y | 집계 기준 시각 |
| `range` | `TODAY \| 7D \| 30D` | Y | 요청 Query Parameter |
| `kpis` | `DashboardDTO.Kpi[]` | Y | 관리자 도메인 집계 결과 |
| `alerts` | `DashboardDTO.Alert[]` | Y | 관리자 도메인 경고/대기 항목 집계 결과 |
| `weeklySignups` | `DashboardDTO.WeeklySignup[]` | Y | 기간 내 가입 추이 집계 결과 |
| `paymentRatio` | `DashboardDTO.PaymentRatio[]` | Y | 결제 수단 비율 집계 결과 |
| `serviceCards` | `DashboardDTO.ServiceCard[]` | Y | 관리자 기능별 요약 집계 결과 |
| `systemStatus` | `DashboardDTO.SystemStatus[]` | Y | AI/스크래핑/운영 상태 집계 결과 |
| `recentActivities` | `DashboardDTO.RecentActivity[]` | Y | 최근 관리자 활동 집계 결과 |

##### `DashboardDTO.Kpi`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `key` | `DashboardKpiKeyType` | Y | KPI 식별자 계약 |
| `title` | `string` | Y | 화면 표시 텍스트 |
| `value` | `number` | Y | 집계 결과 |
| `unit` | `string` | N | 화면 표시 단위 |
| `deltaText` | `string` | N | 비교 증감 텍스트 |
| `severity` | `DashboardSeverityType` | Y | 상태 표시 계약 |
| `targetPath` | `string` | Y | 관리자 라우팅 경로 |

##### `DashboardDTO.Alert`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `id` | `number` | Y | 경고 항목 식별자 |
| `level` | `DashboardAlertLevelType` | Y | 경고 수준 계약 |
| `domain` | `DashboardDomainType` | Y | 관리자 도메인 식별자 |
| `title` | `string` | Y | 경고 제목 |
| `message` | `string` | Y | 경고 설명 |
| `targetPath` | `string` | Y | 관리자 라우팅 경로 |
| `createdAt` | `string` | Y | 집계 항목 기준 시각 |

##### `DashboardDTO.WeeklySignup`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `label` | `string` | Y | 구간 라벨 |
| `count` | `number` | Y | 가입자 집계 결과 |

##### `DashboardDTO.PaymentRatio`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `method` | `DashboardPaymentMethod` | Y | 결제 수단 식별자 |
| `label` | `string` | Y | 결제 수단 표시명 |
| `ratio` | `number` | Y | 결제 수단 비율 |

##### `DashboardDTO.ServiceCard`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `key` | `string` | Y | 서비스 카드 식별자 |
| `title` | `string` | Y | 서비스 카드 제목 |
| `description` | `string` | Y | 서비스 카드 설명 |
| `summaryText` | `string` | Y | 핵심 요약 문구 |
| `targetPath` | `string` | Y | 관리자 라우팅 경로 |

##### `DashboardDTO.SystemStatus`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `key` | `string` | Y | 시스템 상태 식별자 |
| `label` | `string` | Y | 표시명 |
| `status` | `DashboardSystemStatusType` | Y | 상태 표시 계약 |
| `valueText` | `string` | Y | 상태 설명 |

##### `DashboardDTO.RecentActivity`

| Field | Type | Required | Entity 직접 매핑 컬럼 또는 집계 기준 |
|---|---|---|---|
| `id` | `number` | Y | 활동 식별자 |
| `occurredAt` | `string` | Y | 활동 발생 시각 |
| `adminId` | `string` | Y | 활동 수행 관리자 식별자 |
| `message` | `string` | Y | 활동 설명 |
| `targetPath` | `string` | N | 이동 경로 |

#### Response Rules

- `kpis`는 v1 기준 `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` 4개를 반환한다.
- `paymentRatio.ratio` 합계는 100이어야 한다.
- `targetPath`는 관리자 화면 라우팅 가능한 path여야 한다.
- 데이터가 없는 섹션은 `null` 대신 빈 배열을 반환한다.
- 집계 기준 시각은 `baseDateTime`으로 명시한다.

#### Error Response

> `dashboard` 도메인 전용 ErrorCode는 없다.
> 아래 공통 ErrorCode만 사용한다.

| ErrorCode | Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 없는 요청이다. |
| `FORBIDDEN` | 403 | `MASTER`, `BACKEND`, `CS` 외 권한이 접근했다. |
| `BAD_REQUEST` | 400 | `range`가 `TODAY`, `7D`, `30D` 외 값이다. |
| `INTERNAL_SERVER_ERROR` | 500 | 대시보드 요약 집계 중 서버 내부 오류가 발생했다. |

#### Error Response Example

```json
{
  "success": false,
  "statusCode": 400,
  "message": "유효하지 않은 Query Parameter 입니다.",
  "code": "BAD_REQUEST",
  "data": null
}
```

---

## 5. 도메인 응답 규칙

- 본 endpoint는 페이지네이션 응답이 아니므로 `content`, `page`, `size`, `totalElements`, `totalPages`를 사용하지 않는다.
- 본 endpoint는 단일 `DashboardDTO.ResponseSummary` 응답만 반환한다.
- `range` 기본값은 `TODAY`다.
- `range=7D`는 최근 7일, `range=30D`는 최근 30일 집계 윈도우를 의미한다.
- 집계 기준은 UTC 저장값을 사용하되, 응답 문자열은 ISO 8601 형식을 유지한다.

---

## 6. 연관 엔티티

| 엔티티 | 주요 컬럼 | 용도 |
|---|---|---|
| `admins` | `admin_id`, `created_at`, `last_login_at`, `status`, `admin_role` | 관리자 KPI, 최근 관리자 활동 집계 |
| `audit_logs` | `audit_log_id`, `admin_id`, `log_type`, `severity`, `created_at` | 최근 관리자 활동, 운영 알림 집계 |
| `ai_usage_logs` | `ai_usage_log_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at` | AI 사용량 KPI 및 시스템 상태 집계 |
| `ai_ops_settings` | `monthly_budget`, `alert_enabled`, `alert_threshold`, `rate_limit_enabled`, `updated_at` | AI 운영 상태 집계 |
| `rag_documents` | `rag_document_id`, `status`, `indexing_progress`, `created_at`, `updated_at` | AI 운영 상태 및 경고 집계 |
| `scraping_pipelines` | `scraping_pipeline_id`, `source_name`, `pipeline_status`, `last_started_at`, `last_success_at`, `last_failed_at` | 스크래핑 상태 집계 |
| `scraping_logs` | `scraping_log_id`, `scraping_pipeline_id`, `scraping_status`, `executed_at`, `error_message` | 스크래핑 경고 및 최근 활동 집계 |
