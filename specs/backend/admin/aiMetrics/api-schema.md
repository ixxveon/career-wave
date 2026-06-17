# API Schema: aiMetrics

## Spring Boot API -> FastAPI 내부 계약 대응 요약

> 관리자 프론트엔드는 Spring Boot API만 호출한다. FastAPI endpoint는 Spring Boot 내부 연동 전용이며 외부 공개 API가 아니다.

| Spring Boot 외부 API | FastAPI 내부 API | 연동 목적 | Spring Boot 책임 | FastAPI 책임 |
|---|---|---|---|---|
| `GET /api/v1/admin/ai-metrics/summary` | `POST /internal/admin/ai-metrics/usage/summary` | AI 사용량 요약 집계 조회 | JWT 인증/인가, query 검증, FastAPI 응답을 `AiMetricsDTO.ResponseSummary`로 변환 | `ai_usage_logs`, `ai_ops_settings`, `ai_models` 기준 집계 |
| `GET /api/v1/admin/ai-metrics/domain-usage` | `POST /internal/admin/ai-metrics/usage/domain-usage` | 기능 도메인별 사용량 집계 조회 | JWT 인증/인가, query 검증, FastAPI 응답을 `AiMetricsDTO.ResponseDomainUsage`로 변환 | `feature_type`별 요청 수, 토큰, 비용 집계 |
| `GET /api/v1/admin/ai-metrics/token-trend` | `POST /internal/admin/ai-metrics/usage/token-trend` | 시간 버킷별 토큰 추이 조회 | `from`, `to`, `featureType`, `interval` 검증 및 DTO 변환 | `HOURLY` 또는 `DAILY` 버킷 기준 토큰/비용 집계 |
| `GET /api/v1/admin/ai-metrics/heavy-users` | `POST /internal/admin/ai-metrics/usage/heavy-users` | 고사용 사용자 집계 조회 | `limit` 검증 및 DTO 변환 | `member_id` 기준 상위 사용자 집계 |
| `GET /api/v1/admin/ai-metrics/logs` | `POST /internal/admin/ai-metrics/usage/logs/search` | AI 사용 로그 페이지 조회 | 1-based page 계약 유지, FastAPI 응답을 `AiUsageLogDTO.ResponseList`로 변환 | `ai_usage_logs` 검색 및 페이지 결과 반환 |
| `PATCH /api/v1/admin/ai-metrics/budget` | `POST /internal/admin/ai-metrics/ops/sync-settings` | 운영 모델/예산/임계치 변경 후 실행 설정 동기화 | `MASTER` 권한 검증, `ai_ops_settings` 저장, Audit Log 기록, FastAPI 동기화 호출 | 최신 운영 정책을 실행 계층에 반영 |
| `PATCH /api/v1/admin/ai-metrics/alerts/discord` | `POST /internal/admin/ai-metrics/ops/sync-settings` | Discord 알림 활성 여부 변경 후 실행 설정 동기화 | `alert_enabled`만 변경하고 `alert_channel = DISCORD` 고정 | Discord 알림 판단/발송 기준 반영 |
| `PATCH /api/v1/admin/ai-metrics/controls/rate-limit` | `POST /internal/admin/ai-metrics/ops/sync-settings` | rate limit 변경 후 실행 설정 동기화 | `MASTER` 권한 검증, `rate_limit_enabled` 저장, Audit Log 기록 | AI 실행 rate limit 기준 반영 |
| `POST /api/v1/admin/ai-metrics/rag-documents` | `POST /internal/admin/ai-metrics/rag-documents/index` | RAG 문서 업로드 후 인덱싱 시작 | multipart 파일 수신, 파일 저장/메타데이터 생성, FastAPI 인덱싱 시작 호출 | 문서 파싱/청크/임베딩/벡터 인덱싱 비동기 작업 시작 |
| `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}` | `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index` | RAG 문서 삭제 시 벡터 인덱스 제거 | `MASTER` 권한 검증, 삭제 대상 조회, FastAPI 인덱스 제거 호출, Audit Log 기록 | 벡터 인덱스와 내부 리소스 제거 |

> `GET /api/v1/admin/ai-metrics/budget`, `GET /api/v1/admin/ai-metrics/rag-documents`, `GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download`는 Spring Boot가 DB/파일 메타데이터를 기준으로 응답하며 FastAPI 내부 호출을 수행하지 않는다.
> `POST /internal/admin/ai-metrics/rag-documents/index/worker`와 `POST /internal/admin/ai-metrics/usage/log`는 FastAPI 내부 워커/AI 실행 흐름에서 사용하는 계약이며 관리자 외부 API와 1:1로 직접 대응하지 않는다.

### AI 사용량 집계 책임 분리

- `summary`, `domain-usage`, `token-trend`, `heavy-users`, `logs` 조회의 집계 계산은 FastAPI가 담당한다.
- Spring Boot는 `ai_usage_logs`를 직접 집계하지 않고 FastAPI 내부 집계 API를 호출한다.
- Spring Boot는 FastAPI 응답을 `AiMetricsDTO`, `AiUsageLogDTO`와 외부 `ApiResponse<T>` 형식으로 변환한다.
- 기간, 기능 유형, 집계 단위, 페이지 요청 검증과 관리자 권한 검증은 Spring Boot가 담당한다.

> 백엔드와 프론트엔드 간 `aiMetrics` 도메인 API 계약 문서.
> 본 문서는 기능 설명 문서가 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 모든 page Query Parameter는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- `from`, `to`는 ISO 8601 UTC 문자열을 사용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서의 ErrorCode 표에는 `aiMetrics` 도메인 코드만 작성한다.

### 권한 표기

- 본 문서에서 사용하는 권한 표기는 `MASTER`, `BACKEND`다.
- Spring Security에서는 `MASTER -> ROLE_MASTER`, `BACKEND -> ROLE_BACKEND`로 매핑한다.

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

### 공통 페이지 응답 예시

```json
{
  "success": true,
  "message": "요청이 성공했습니다.",
  "data": {
    "content": [],
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

### 공통 실패 응답 예시

```json
{
  "success": false,
  "status": 404,
  "message": "RAG 문서를 찾을 수 없습니다.",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | ERD CHECK 제약 |
|---|---|---|
| `AiFeatureType` | `DOCUMENT`, `INTERVIEW` | `ai_usage_logs.feature_type` |
| `AlertChannelType` | `DISCORD`, `SLACK`, `EMAIL` | `ai_ops_settings.alert_channel` |
| `RagDocumentStatusType` | `UPLOADED`, `INDEXING`, `COMPLETED`, `FAILED` | `rag_documents.status` |

---

## 3. Query Parameter -> ERD 컬럼 매핑

### GET /api/v1/admin/ai-metrics/summary

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `from` | `string` | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | `ai_usage_logs.feature_type` | 기능 유형 필터 |

### GET /api/v1/admin/ai-metrics/domain-usage

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `from` | `string` | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |

### GET /api/v1/admin/ai-metrics/token-trend

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `from` | `string` | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `interval` | `HOURLY \| DAILY` | 없음 | 집계 단위 |

### GET /api/v1/admin/ai-metrics/heavy-users

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `from` | `string` | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `limit` | `number` | 없음 | 상위 사용자 조회 건수 |

### GET /api/v1/admin/ai-metrics/logs

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `featureType` | `DOCUMENT \| INTERVIEW` | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

> 본 endpoint는 `ai_usage_logs` 기반의 **AI 사용 로그**를 반환한다.
> `audit_logs` 기반의 **AI 운영 이벤트 로그** 조회는 `auditLog` 도메인 책임이다.

### GET /api/v1/admin/ai-metrics/rag-documents

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

---

## 4. AI Metrics API

### 4.1 GET /api/v1/admin/ai-metrics/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/summary`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `from` | `string` | N | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | N | `ai_usage_logs.feature_type` | 기능 유형 필터 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiMetricsDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "AI 사용량 요약 조회에 성공했습니다.",
  "data": {
    "totalRequests": 1250,
    "totalInputTokens": 420000,
    "totalOutputTokens": 185000,
    "totalCost": 980000,
    "documentRequests": 820,
    "interviewRequests": 430,
    "activeModelId": 1,
    "activeModelName": "gpt-4o-mini"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AI_MODEL_NOT_FOUND` | 404 | 활성 AI 모델을 찾을 수 없습니다. |
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정을 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `from`, `to` 형식이 ISO 8601 UTC가 아니거나 `from > to`이면 공통 `400` 검증 오류가 반환된다.

---

### 4.2 GET /api/v1/admin/ai-metrics/domain-usage

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/domain-usage`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `from` | `string` | N | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiMetricsDTO.ResponseDomainUsage>`

```json
{
  "success": true,
  "message": "도메인별 AI 사용량 조회에 성공했습니다.",
  "data": {
    "document": {
      "requestCount": 820,
      "inputTokens": 250000,
      "outputTokens": 110000,
      "cost": 560000
    },
    "interview": {
      "requestCount": 430,
      "inputTokens": 170000,
      "outputTokens": 75000,
      "cost": 420000
    }
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `from`, `to` 형식이 ISO 8601 UTC가 아니거나 `from > to`이면 공통 `400` 검증 오류가 반환된다.

---

### 4.3 GET /api/v1/admin/ai-metrics/token-trend

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/token-trend`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `from` | `string` | N | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | N | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `interval` | `HOURLY \| DAILY` | Y | 없음 | 집계 단위 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiMetricsDTO.ResponseTokenTrend>`

```json
{
  "success": true,
  "message": "토큰 사용 추이 조회에 성공했습니다.",
  "data": {
    "interval": "DAILY",
    "points": [
      {
        "bucket": "2026-06-01T00:00:00Z",
        "inputTokens": 12000,
        "outputTokens": 5400,
        "cost": 28000
      }
    ]
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `from`, `to` 형식이 ISO 8601 UTC가 아니거나 `from > to`, `interval`이 허용 범위가 아니면 공통 `400` 검증 오류가 반환된다.

---

### 4.4 GET /api/v1/admin/ai-metrics/heavy-users

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/heavy-users`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `from` | `string` | N | `ai_usage_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `ai_usage_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `featureType` | `DOCUMENT \| INTERVIEW` | N | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `limit` | `number` | N | 없음 | 상위 사용자 조회 건수 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiMetricsDTO.ResponseHeavyUsers>`

```json
{
  "success": true,
  "message": "고사용 사용자 목록 조회에 성공했습니다.",
  "data": {
    "users": [
      {
        "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
        "requestCount": 95,
        "inputTokens": 52000,
        "outputTokens": 21000,
        "cost": 118000
      }
    ]
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `from`, `to` 형식이 ISO 8601 UTC가 아니거나 `from > to`, `limit < 1`이면 공통 `400` 검증 오류가 반환된다.

---

### 4.5 GET /api/v1/admin/ai-metrics/logs

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/logs`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `featureType` | `DOCUMENT \| INTERVIEW` | N | `ai_usage_logs.feature_type` | 기능 유형 필터 |
| `page` | `number` | N | 없음 | 페이지 번호, 1-based |
| `size` | `number` | N | 없음 | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiUsageLogDTO.ResponseList>`

```json
{
  "success": true,
  "message": "AI 사용 로그 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "aiUsageLogId": 101,
        "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
        "sessionId": null,
        "aiModelId": 1,
        "featureType": "DOCUMENT",
        "inputTokens": 1200,
        "outputTokens": 450,
        "cost": 2800,
        "createdAt": "2026-06-10T02:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1250,
    "totalPages": 63
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `page < 1`, `size < 1`, `featureType`이 허용 범위가 아니면 공통 `400` 검증 오류가 반환된다.

---

### 4.6 GET /api/v1/admin/ai-metrics/budget

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/budget`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AiOpsSettingDTO.ResponseBudget>`

```json
{
  "success": true,
  "message": "AI 예산 및 알림 설정 조회에 성공했습니다.",
  "data": {
    "aiOpsSettingId": 1,
    "selectedModelId": 1,
    "monthlyBudget": 3000000,
    "alertEnabled": true,
    "alertChannel": "DISCORD",
    "alertThreshold": 85,
    "rateLimitEnabled": false,
    "updatedAt": "2026-06-10T02:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정을 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.7 PATCH /api/v1/admin/ai-metrics/budget

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/ai-metrics/budget`
- **Auth**: `MASTER`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: `AiOpsSettingDTO.RequestUpdateBudget`

```json
{
  "selectedModelId": 1,
  "monthlyBudget": 3500000,
  "alertThreshold": 90
}
```

#### Response Body

- Response DTO: `ApiResponse<AiOpsSettingDTO.ResponseBudget>`

```json
{
  "success": true,
  "message": "AI 예산 및 임계치 수정에 성공했습니다.",
  "data": {
    "aiOpsSettingId": 1,
    "selectedModelId": 1,
    "monthlyBudget": 3500000,
    "alertEnabled": true,
    "alertChannel": "DISCORD",
    "alertThreshold": 90,
    "rateLimitEnabled": false,
    "updatedAt": "2026-06-10T03:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AI_MODEL_NOT_FOUND` | 404 | 선택한 AI 모델을 찾을 수 없습니다. |
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정을 찾을 수 없습니다. |
| `INVALID_MONTHLY_BUDGET` | 400 | 유효하지 않은 월 예산 값입니다. |
| `INVALID_ALERT_THRESHOLD` | 400 | 유효하지 않은 알림 임계치 값입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.8 PATCH /api/v1/admin/ai-metrics/alerts/discord

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/ai-metrics/alerts/discord`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: `AiOpsSettingDTO.RequestUpdateDiscordAlert`

```json
{
  "alertEnabled": true
}
```

#### Response Body

- Response DTO: `ApiResponse<AiOpsSettingDTO.ResponseBudget>`

```json
{
  "success": true,
  "message": "Discord 알림 설정 변경에 성공했습니다.",
  "data": {
    "aiOpsSettingId": 1,
    "selectedModelId": 1,
    "monthlyBudget": 3500000,
    "alertEnabled": true,
    "alertChannel": "DISCORD",
    "alertThreshold": 90,
    "rateLimitEnabled": false,
    "updatedAt": "2026-06-10T03:10:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정을 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.9 PATCH /api/v1/admin/ai-metrics/controls/rate-limit

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/ai-metrics/controls/rate-limit`
- **Auth**: `MASTER`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: `AiOpsSettingDTO.RequestUpdateRateLimit`

```json
{
  "rateLimitEnabled": true
}
```

#### Response Body

- Response DTO: `ApiResponse<AiOpsSettingDTO.ResponseBudget>`

```json
{
  "success": true,
  "message": "AI rate limit 설정 변경에 성공했습니다.",
  "data": {
    "aiOpsSettingId": 1,
    "selectedModelId": 1,
    "monthlyBudget": 3500000,
    "alertEnabled": true,
    "alertChannel": "DISCORD",
    "alertThreshold": 90,
    "rateLimitEnabled": true,
    "updatedAt": "2026-06-10T03:20:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정을 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.10 GET /api/v1/admin/ai-metrics/rag-documents

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/rag-documents`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `page` | `number` | N | 없음 | 페이지 번호, 1-based |
| `size` | `number` | N | 없음 | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<RagDocumentDTO.ResponseList>`

```json
{
  "success": true,
  "message": "RAG 문서 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "ragDocumentId": 10,
        "uploadedBy": 1,
        "fileUuid": "1fb3e31e-fd5a-420d-8135-ec682ac53956",
        "originalFileName": "faq.pdf",
        "mimeType": "application/pdf",
        "fileSize": 182030,
        "chunkCount": 24,
        "indexingProgress": 100,
        "status": "COMPLETED",
        "createdAt": "2026-06-10T01:00:00Z",
        "updatedAt": "2026-06-10T01:10:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 12,
    "totalPages": 1
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 공통 요청 검증 실패: `page < 1`, `size < 1`이면 공통 `400` 검증 오류가 반환된다.

---

### 4.11 POST /api/v1/admin/ai-metrics/rag-documents

- **Method**: `POST`
- **Path**: `/api/v1/admin/ai-metrics/rag-documents`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: `RagDocumentDTO.RequestUpload`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `file` | `binary` | Y | 없음 | 업로드할 원본 문서 파일 |

> 요청 Content-Type은 `multipart/form-data`다.
> `originalFileName`, `mimeType`, `fileSize`는 업로드된 파일 파트에서 Spring Boot가 추출해 `rag_documents` 메타데이터로 저장한다.
> Spring Boot는 원본 파일을 저장 가능한 경로에 보관한 뒤 `fileUuid`, `originalFileName`, `filePath`, `mimeType`, `fileSize`를 포함한 JSON 내부 계약으로 FastAPI의 `POST /internal/admin/ai-metrics/rag-documents/index`를 호출한다.
> FastAPI는 원본 파일 multipart를 직접 수신하지 않으며, Spring Boot가 전달한 저장 경로와 메타데이터를 기준으로 비동기 인덱싱을 시작한다.

#### Response Body

- Response DTO: `ApiResponse<RagDocumentDTO.ResponseDetail>`

```json
{
  "success": true,
  "message": "RAG 문서 업로드에 성공했습니다.",
  "data": {
    "ragDocumentId": 10,
    "uploadedBy": 1,
    "fileUuid": "1fb3e31e-fd5a-420d-8135-ec682ac53956",
    "originalFileName": "faq.pdf",
    "filePath": "/rag/2026/06/faq.pdf",
    "mimeType": "application/pdf",
    "fileSize": 182030,
    "chunkCount": 0,
    "indexingProgress": 0,
    "status": "UPLOADED",
    "createdAt": "2026-06-10T01:00:00Z",
    "updatedAt": "2026-06-10T01:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `RAG_DOCUMENT_ALREADY_INDEXING` | 409 | 현재 인덱싱 중인 RAG 문서입니다. |
| `RAG_DOCUMENT_INDEXING_FAILED` | 500 | RAG 문서 인덱싱 시작 요청에 실패했습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.
> 비동기 인덱싱 실행 중 발생한 실패는 업로드 응답이 아니라 이후 `rag_documents.status = FAILED` 조회 결과로 확인한다.

---

### 4.12 GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download

- **Method**: `GET`
- **Path**: `/api/v1/admin/ai-metrics/rag-documents/{documentId}/download`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<RagDocumentDTO.ResponseDownload>`

```json
{
  "success": true,
  "message": "RAG 문서 다운로드 정보 조회에 성공했습니다.",
  "data": {
    "ragDocumentId": 10,
    "originalFileName": "faq.pdf",
    "fileUuid": "1fb3e31e-fd5a-420d-8135-ec682ac53956",
    "mimeType": "application/pdf",
    "fileSize": 182030,
    "downloadUrl": "/api/v1/admin/ai-metrics/rag-documents/10/download"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `RAG_DOCUMENT_NOT_FOUND` | 404 | RAG 문서를 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.13 DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}

- **Method**: `DELETE`
- **Path**: `/api/v1/admin/ai-metrics/rag-documents/{documentId}`
- **Auth**: `MASTER`

#### Query Parameter

- 없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<RagDocumentDTO.ResponseDelete>`

```json
{
  "success": true,
  "message": "RAG 문서 삭제에 성공했습니다.",
  "data": {
    "ragDocumentId": 10,
    "deleted": true
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `RAG_DOCUMENT_NOT_FOUND` | 404 | RAG 문서를 찾을 수 없습니다. |
| `RAG_DOCUMENT_DELETE_FAILED` | 500 | RAG 문서 삭제에 실패했습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

## 5. DTO 계약 표

### 5.1 `AiMetricsDTO.ResponseSummary`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `totalRequests` | `number` | Y | 없음 | 전체 요청 수 |
| `totalInputTokens` | `number` | Y | 없음 | 전체 입력 토큰 수 |
| `totalOutputTokens` | `number` | Y | 없음 | 전체 출력 토큰 수 |
| `totalCost` | `number` | Y | 없음 | 전체 비용 |
| `documentRequests` | `number` | Y | 없음 | `featureType = DOCUMENT` 요청 수 |
| `interviewRequests` | `number` | Y | 없음 | `featureType = INTERVIEW` 요청 수 |
| `activeModelId` | `number` | Y | `ai_models.ai_model_id` | 현재 운영 모델 ID |
| `activeModelName` | `string` | Y | `ai_models.model_name` | 현재 운영 모델명 |

### 5.2 `AiMetricsDTO.ResponseDomainUsage`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `document.requestCount` | `number` | Y | 없음 | 문서 기능 요청 수 |
| `document.inputTokens` | `number` | Y | 없음 | 문서 기능 입력 토큰 수 |
| `document.outputTokens` | `number` | Y | 없음 | 문서 기능 출력 토큰 수 |
| `document.cost` | `number` | Y | 없음 | 문서 기능 비용 |
| `interview.requestCount` | `number` | Y | 없음 | 면접 기능 요청 수 |
| `interview.inputTokens` | `number` | Y | 없음 | 면접 기능 입력 토큰 수 |
| `interview.outputTokens` | `number` | Y | 없음 | 면접 기능 출력 토큰 수 |
| `interview.cost` | `number` | Y | 없음 | 면접 기능 비용 |

### 5.3 `AiMetricsDTO.ResponseTokenTrend`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `interval` | `HOURLY \| DAILY` | Y | 없음 | 집계 단위 |
| `points[].bucket` | `string` | Y | 없음 | 집계 시점 버킷 |
| `points[].inputTokens` | `number` | Y | 없음 | 버킷별 입력 토큰 수 |
| `points[].outputTokens` | `number` | Y | 없음 | 버킷별 출력 토큰 수 |
| `points[].cost` | `number` | Y | 없음 | 버킷별 비용 |

### 5.4 `AiMetricsDTO.ResponseHeavyUsers`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `users[].memberId` | `string` | Y | `ai_usage_logs.member_id` | 회원 ID |
| `users[].requestCount` | `number` | Y | 없음 | 사용자별 요청 수 |
| `users[].inputTokens` | `number` | Y | 없음 | 사용자별 입력 토큰 수 |
| `users[].outputTokens` | `number` | Y | 없음 | 사용자별 출력 토큰 수 |
| `users[].cost` | `number` | Y | 없음 | 사용자별 비용 |

### 5.5 `AiUsageLogDTO.ResponseItem`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `aiUsageLogId` | `number` | Y | `ai_usage_logs.ai_usage_log_id` | AI 사용 로그 ID |
| `memberId` | `string` | Y | `ai_usage_logs.member_id` | 회원 ID |
| `sessionId` | `string \| null` | N | `ai_usage_logs.session_id` | 면접 세션 ID |
| `aiModelId` | `number` | Y | `ai_usage_logs.ai_model_id` | AI 모델 ID |
| `featureType` | `DOCUMENT \| INTERVIEW` | Y | `ai_usage_logs.feature_type` | 기능 유형 |
| `inputTokens` | `number` | Y | `ai_usage_logs.input_tokens` | 입력 토큰 수 |
| `outputTokens` | `number` | Y | `ai_usage_logs.output_tokens` | 출력 토큰 수 |
| `cost` | `number` | Y | `ai_usage_logs.cost` | 비용 |
| `createdAt` | `string` | Y | `ai_usage_logs.created_at` | 발생 시각 |

### 5.6 `AiUsageLogDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `AiUsageLogDTO.ResponseItem[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

### 5.7 `AiOpsSettingDTO.RequestUpdateBudget`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `selectedModelId` | `number` | Y | `ai_ops_settings.selected_model_id` | 운영 모델 ID |
| `monthlyBudget` | `number` | Y | `ai_ops_settings.monthly_budget` | 월 예산 |
| `alertThreshold` | `number` | Y | `ai_ops_settings.alert_threshold` | 알림 임계치 |

### 5.8 `AiOpsSettingDTO.RequestUpdateDiscordAlert`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `alertEnabled` | `boolean` | Y | `ai_ops_settings.alert_enabled` | Discord 알림 활성 여부 |

> 본 endpoint는 경로 계약상 `alert_channel = DISCORD`를 전제로 하며, 요청 본문에서 다른 채널 값을 받지 않는다.

### 5.9 `AiOpsSettingDTO.RequestUpdateRateLimit`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `rateLimitEnabled` | `boolean` | Y | `ai_ops_settings.rate_limit_enabled` | rate limit 활성 여부 |

### 5.10 `AiOpsSettingDTO.ResponseBudget`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `aiOpsSettingId` | `number` | Y | `ai_ops_settings.ai_ops_setting_id` | 운영 설정 ID |
| `selectedModelId` | `number` | Y | `ai_ops_settings.selected_model_id` | 운영 모델 ID |
| `monthlyBudget` | `number` | Y | `ai_ops_settings.monthly_budget` | 월 예산 |
| `alertEnabled` | `boolean` | Y | `ai_ops_settings.alert_enabled` | 알림 활성 여부 |
| `alertChannel` | `DISCORD \| SLACK \| EMAIL` | Y | `ai_ops_settings.alert_channel` | 알림 채널 |
| `alertThreshold` | `number` | Y | `ai_ops_settings.alert_threshold` | 알림 임계치 |
| `rateLimitEnabled` | `boolean` | Y | `ai_ops_settings.rate_limit_enabled` | rate limit 활성 여부 |
| `updatedAt` | `string` | Y | `ai_ops_settings.updated_at` | 수정 시각 |

> MVP에서는 Discord 알림만 지원한다. `SLACK`, `EMAIL`은 ERD 확장 가능성을 위한 값이며 현재 API에서는 변경 또는 발송을 지원하지 않는다.

### 5.11 `RagDocumentDTO.RequestUpload`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `file` | `binary` | Y | 없음 | 업로드할 원본 문서 파일 |

> `original_file_name`, `mime_type`, `file_size`, `file_path`는 업로드된 파일로부터 서버가 추출 또는 생성한다.

### 5.12 `RagDocumentDTO.ResponseItem`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `ragDocumentId` | `number` | Y | `rag_documents.rag_document_id` | RAG 문서 ID |
| `uploadedBy` | `number` | Y | `rag_documents.uploaded_by` | 업로더 관리자 ID |
| `fileUuid` | `string` | Y | `rag_documents.file_uuid` | 파일 UUID |
| `originalFileName` | `string` | Y | `rag_documents.original_file_name` | 원본 파일명 |
| `mimeType` | `string \| null` | N | `rag_documents.mime_type` | MIME 타입 |
| `fileSize` | `number \| null` | N | `rag_documents.file_size` | 파일 크기 |
| `chunkCount` | `number` | Y | `rag_documents.chunk_count` | 청크 수 |
| `indexingProgress` | `number` | Y | `rag_documents.indexing_progress` | 인덱싱 진행률 |
| `status` | `UPLOADED \| INDEXING \| COMPLETED \| FAILED` | Y | `rag_documents.status` | 인덱싱 상태 |
| `createdAt` | `string` | Y | `rag_documents.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | `rag_documents.updated_at` | 수정 시각 |

### 5.13 `RagDocumentDTO.ResponseDetail`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `ragDocumentId` | `number` | Y | `rag_documents.rag_document_id` | RAG 문서 ID |
| `uploadedBy` | `number` | Y | `rag_documents.uploaded_by` | 업로더 관리자 ID |
| `fileUuid` | `string` | Y | `rag_documents.file_uuid` | 파일 UUID |
| `originalFileName` | `string` | Y | `rag_documents.original_file_name` | 원본 파일명 |
| `filePath` | `string` | Y | `rag_documents.file_path` | 저장 경로 |
| `mimeType` | `string \| null` | N | `rag_documents.mime_type` | MIME 타입 |
| `fileSize` | `number \| null` | N | `rag_documents.file_size` | 파일 크기 |
| `chunkCount` | `number` | Y | `rag_documents.chunk_count` | 청크 수 |
| `indexingProgress` | `number` | Y | `rag_documents.indexing_progress` | 인덱싱 진행률 |
| `status` | `UPLOADED \| INDEXING \| COMPLETED \| FAILED` | Y | `rag_documents.status` | 인덱싱 상태 |
| `createdAt` | `string` | Y | `rag_documents.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | `rag_documents.updated_at` | 수정 시각 |

### 5.14 `RagDocumentDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `RagDocumentDTO.ResponseItem[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

### 5.15 `RagDocumentDTO.ResponseDownload`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `ragDocumentId` | `number` | Y | `rag_documents.rag_document_id` | RAG 문서 ID |
| `originalFileName` | `string` | Y | `rag_documents.original_file_name` | 원본 파일명 |
| `fileUuid` | `string` | Y | `rag_documents.file_uuid` | 파일 UUID |
| `mimeType` | `string \| null` | N | `rag_documents.mime_type` | MIME 타입 |
| `fileSize` | `number \| null` | N | `rag_documents.file_size` | 파일 크기 |
| `downloadUrl` | `string` | Y | 없음 | 다운로드 URL |

### 5.16 `RagDocumentDTO.ResponseDelete`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `ragDocumentId` | `number` | Y | `rag_documents.rag_document_id` | 삭제 대상 문서 ID |
| `deleted` | `boolean` | Y | 없음 | 삭제 성공 여부 |

---

## 6. ErrorCode 계약 표

### 6.1 AiMetrics Domain ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `AI_MODEL_NOT_FOUND` | 404 | 요청에 필요한 AI 모델이 존재하지 않는다. |
| `AI_MODEL_EXECUTION_FAILED` | 500 | OpenAI 호출 또는 모델 실행 처리에 실패했다. |
| `AI_OPS_SETTING_NOT_FOUND` | 404 | AI 운영 설정이 존재하지 않는다. |
| `AI_USAGE_LOG_CREATE_FAILED` | 500 | AI 사용 로그 생성에 실패했다. |
| `INVALID_ALERT_THRESHOLD` | 400 | 알림 임계치 값이 허용 범위를 벗어났다. |
| `INVALID_MONTHLY_BUDGET` | 400 | 월 예산 값이 허용 범위를 벗어났다. |
| `RAG_DOCUMENT_NOT_FOUND` | 404 | 요청한 RAG 문서가 존재하지 않는다. |
| `RAG_DOCUMENT_ALREADY_INDEXING` | 409 | 현재 RAG 문서가 인덱싱 중이다. |
| `RAG_DOCUMENT_INDEXING_FAILED` | 500 | RAG 문서 인덱싱 시작 요청에 실패했다. |
| `RAG_DOCUMENT_DELETE_FAILED` | 500 | RAG 문서 삭제 처리에 실패했다. |
