# API Schema: 관리자 AI 매트릭스

## 공통 규칙

- Base Path: `/api/admin/ai-metrics`
- Auth: Bearer Token
- Role: `ROLE_ADMIN`
- Response: `ApiResponse<T>`
- 날짜 형식: ISO 8601
- 비용 단위: USD 기준 추정치

## 공통 타입

```ts
type AiDomain = 'DOCUMENT_AI' | 'INTERVIEW_AI' | 'ADMIN_AI';
type AiEventSeverity = 'INFO' | 'WARN' | 'ERROR';
type AiHealthStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
type AiUsageRiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';
type RagIndexStatus = 'SYNCED' | 'INDEXING' | 'FAILED';
```

## GET /summary

전체 AI 사용량 요약을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | string | false | 조회 시작 일시 |
| `to` | string | false | 조회 종료 일시 |

### Response Data

```json
{
  "totalRequests": 12840,
  "successRequests": 12601,
  "failedRequests": 239,
  "totalInputTokens": 4230000,
  "totalOutputTokens": 1870000,
  "estimatedCost": 1440.25,
  "averageLatencyMs": 842,
  "healthStatus": "WARNING",
  "lastSyncedAt": "2026-06-01T09:10:00+09:00"
}
```

## GET /domain-usage

AI 서류 기능, AI 면접 기능, 관리자 AI 기능의 도메인별 사용량을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | string | false | 조회 시작 일시 |
| `to` | string | false | 조회 종료 일시 |

### Response Data

```json
[
  {
    "domain": "DOCUMENT_AI",
    "domainLabel": "AI 서류 기능",
    "requestCount": 5400,
    "successCount": 5320,
    "failureCount": 80,
    "failureRate": 1.48,
    "inputTokens": 2100000,
    "outputTokens": 820000,
    "estimatedCost": 620.15,
    "averageLatencyMs": 760,
    "riskLevel": "NORMAL",
    "displayModelName": "서류 분석 모델",
    "actualModelName": "actual-provider-model"
  }
]
```

### Rules

- 화면의 주요 카드, 차트, 필터는 `domain` 기준으로 구성한다.
- `displayModelName`은 화면 표시용 이름이다.
- `actualModelName`은 상세 진단과 비용 근거 확인에서만 보조 정보로 사용한다.

## GET /token-trend

시간대별 입력/출력 토큰과 비용 추정 추이를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | AiDomain | false | 특정 도메인 필터 |
| `interval` | string | false | `HOURLY`, `DAILY` |
| `from` | string | false | 조회 시작 일시 |
| `to` | string | false | 조회 종료 일시 |

### Response Data

```json
[
  {
    "bucket": "2026-06-01T09:00:00+09:00",
    "inputTokens": 34000,
    "outputTokens": 18000,
    "estimatedCost": 12.5,
    "requestCount": 320
  }
]
```

## GET /heavy-users

토큰 사용량이 높은 사용자 또는 이상 사용량 사용자를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | AiDomain | false | 특정 도메인 필터 |
| `limit` | number | false | 기본 10 |

### Response Data

```json
[
  {
    "userId": "USR_8892",
    "maskedUserLabel": "USR_88**",
    "domain": "INTERVIEW_AI",
    "domainLabel": "AI 면접 기능",
    "tokenUsage": 12403,
    "requestCount": 41,
    "riskLevel": "CRITICAL",
    "lastUsedAt": "2026-06-01T08:58:00+09:00"
  }
]
```

## GET /logs

최근 AI 운영 이벤트 로그를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | AiDomain | false | 특정 도메인 필터 |
| `severity` | AiEventSeverity | false | 로그 등급 필터 |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 20 |

### Response Data

```json
{
  "content": [
    {
      "eventId": 101,
      "occurredAt": "2026-06-01T09:03:10+09:00",
      "domain": "ADMIN_AI",
      "domainLabel": "관리자 AI 기능",
      "severity": "WARN",
      "message": "관리자 AI 기능 응답 시간이 기준치를 초과했습니다.",
      "displayModelName": "관리자 보조 모델",
      "actualModelName": "actual-provider-model"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 52,
  "totalPages": 3
}
```

## GET /budget

월간 AI 비용 예산과 알림 설정을 조회한다.

### Response Data

```json
{
  "monthlyBudget": 2000,
  "currentSpend": 1440.25,
  "forecastSpend": 1870,
  "thresholdPercent": 85,
  "discordAlertEnabled": true,
  "rateLimitEnabled": false
}
```

## PATCH /budget

월간 예산과 알림 임계치를 수정한다.

### Request

```json
{
  "monthlyBudget": 2000,
  "thresholdPercent": 85
}
```

## PATCH /alerts/discord

디스코드 알림 사용 여부를 수정한다.

### Request

```json
{
  "enabled": true
}
```

## POST /controls/rate-limit

AI 사용량 제한 상태를 변경한다.

### Request

```json
{
  "enabled": true,
  "reason": "월간 예산 임계치 초과"
}
```

## GET /rag-documents

관리자 AI 기능에 포함된 RAG 지식 베이스 인덱싱 상태를 조회한다.

### Response Data

```json
[
  {
    "documentId": "DOC-001",
    "name": "admin-guide.pdf",
    "chunkCount": 1420,
    "progressPercent": 79,
    "status": "INDEXING",
    "updatedAt": "2026-06-01T08:50:00+09:00"
  }
]
```

## Error Cases

| Status | Message |
|--------|---------|
| 400 | 조회 조건이 올바르지 않습니다. |
| 401 | 인증이 필요합니다. |
| 403 | 관리자 권한이 필요합니다. |
| 500 | AI 매트릭스 조회 중 오류가 발생했습니다. |
