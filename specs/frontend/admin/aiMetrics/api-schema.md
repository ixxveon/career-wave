# API Schema: 관리자 AI 매트릭스

## 공통 규칙

- Base Path: `/api/v1/admin/ai-metrics`
- Auth: Bearer Token
- Role: See `Permissions`.
- Response: `ApiResponse<T>`

## Permissions

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`, `USER`를 사용한다. Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`, `ROLE_USER`로 매핑한다.

| Method | Path | Allowed Roles |
|---|---|---|
| GET | `/api/v1/admin/ai-metrics/summary` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/domain-usage` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/token-trend` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/heavy-users` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/logs` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/budget` | `MASTER`, `BACKEND` |
| PATCH | `/api/v1/admin/ai-metrics/budget` | `MASTER` |
| PATCH | `/api/v1/admin/ai-metrics/alerts/discord` | `MASTER`, `BACKEND` |
| PATCH | `/api/v1/admin/ai-metrics/controls/rate-limit` | `MASTER` |
| GET | `/api/v1/admin/ai-metrics/rag-documents` | `MASTER`, `BACKEND` |
| POST | `/api/v1/admin/ai-metrics/rag-documents` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/ai-metrics/rag-documents/{documentId}/download` | `MASTER`, `BACKEND` |
| DELETE | `/api/v1/admin/ai-metrics/rag-documents/{documentId}` | `MASTER` |
- 날짜 형식: ISO 8601
- 비용 단위: USD 기준 추정치

## Response Wrapper Format

모든 endpoint는 `ApiResponse<T>`로 감싼 응답을 반환한다. 아래 endpoint별 JSON 예시는 가독성을 위해 `data` 내부 값만 표시한다.

### Success

```json
{
  "success": true,
  "data": {},
  "message": null,
  "timestamp": "2026-06-01T09:10:00+09:00"
}
```

### Error

```json
{
  "success": false,
  "data": null,
  "message": "오류 메시지",
  "timestamp": "2026-06-01T09:10:00+09:00"
}
```

## 조회 기간 제약

`GET /summary`, `GET /domain-usage`, `GET /token-trend`, `GET /heavy-users`의 `from`, `to`는 아래 기준을 따른다.

| Parameter | Default | Maximum Range | Validation |
|-----------|---------|---------------|------------|
| `from`, `to` | 최근 7일 | 최대 90일 | `to - from <= 90일` |

- 조회 기간이 90일을 초과하면 400 응답을 반환한다.
- `from`, `to`가 모두 없으면 서버는 최근 7일 기준으로 집계한다.

## 비용 필드 규칙

- 비용 단가를 알 수 없는 경우 비용 추정 필드는 `null`로 내려온다.
- `estimatedCost`, `currentSpend`, `forecastSpend`는 모두 운영 참고용 추정치이며 정산 금액으로 사용하지 않는다.

## 공통 타입

```ts
type AiDomain = 'DOCUMENT' | 'INTERVIEW';
type AiEventSeverity = 'INFO' | 'WARN' | 'ERROR';
type AiHealthStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
type AiUsageRiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';
type RagIndexStatus = 'SYNCED' | 'INDEXING' | 'FAILED' | 'DELETING';
```

- 상태 전이:
  - `SYNCED | FAILED -> DELETING -> (삭제 성공 시 목록에서 제거)`
  - `DELETING -> FAILED` (삭제 실패 시)

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
  "estimatedCost": null,
  "averageLatencyMs": 842,
  "healthStatus": "WARNING",
  "lastSyncedAt": "2026-06-01T09:10:00+09:00"
}
```

- `estimatedCost`: `number | null` (비용 단가를 알 수 없는 경우 `null`)

## GET /domain-usage

AI 서류 기능, AI 면접 기능의 도메인별 사용량을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | string | false | 조회 시작 일시 |
| `to` | string | false | 조회 종료 일시 |

### Response Data

```json
[
  {
    "domain": "DOCUMENT",
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

- `estimatedCost`: `number | null` (비용 단가를 알 수 없는 경우 `null`)

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

- `estimatedCost`: `number | null` (비용 단가를 알 수 없는 경우 `null`)

## GET /heavy-users

토큰 사용량이 높은 사용자 또는 이상 사용량 사용자를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `domain` | AiDomain | false | 특정 도메인 필터 |
| `limit` | number | false | 기본 10 |
| `from` | string | false | 조회 시작 일시 |
| `to` | string | false | 조회 종료 일시 |

### Response Data

```json
[
  {
    "userId": "USR_8892",
    "maskedUserLabel": "USR_88**",
    "domain": "INTERVIEW",
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
| `page` | number | false | 0부터 시작 |
| `size` | number | false | 기본 20 |

### Response Data

```json
{
  "content": [
    {
      "eventId": 101,
      "occurredAt": "2026-06-01T09:03:10+09:00",
      "domain": "DOCUMENT",
      "domainLabel": "AI 서류 기능",
      "severity": "WARN",
      "message": "AI 서류 기능 응답 시간이 기준치를 초과했습니다.",
      "displayModelName": "서류 분석 모델",
      "actualModelName": "actual-provider-model"
    }
  ],
  "page": 0,
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
  "currentSpend": null,
  "forecastSpend": null,
  "thresholdPercent": 85,
  "discordAlertEnabled": true,
  "rateLimitEnabled": false
}
```

- `currentSpend`: `number | null` (비용 단가를 알 수 없는 경우 `null`)
- `forecastSpend`: `number | null` (비용 단가를 알 수 없는 경우 `null`)

## PATCH /budget

월간 예산과 알림 임계치를 수정한다.

### Validation

| Field | Constraint |
|-------|------------|
| `monthlyBudget` | 0 이상 |
| `thresholdPercent` | 1 이상 100 이하 |

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

## PATCH /controls/rate-limit

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

## POST /rag-documents

RAG 지식 베이스 인덱싱에 사용할 문서를 업로드한다.

### Request

Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | true | 업로드할 RAG 원본 문서 |
| `name` | string | false | 화면에 표시할 문서명. 없으면 원본 파일명을 사용 |

### Validation

| Field | Constraint |
|-------|------------|
| `file` | 허용 확장자: `.pdf`, `.txt`, `.md` |
| `file` | 허용 MIME: `application/pdf`, `text/plain`, `text/markdown` |
| `file` | 최대 크기: 10MB |
| `name` | 미입력 시 원본 파일명을 사용 |

### Response Data

```json
{
  "documentId": "DOC-002",
  "name": "interview-guide.pdf",
  "chunkCount": 0,
  "progressPercent": 0,
  "status": "INDEXING",
  "updatedAt": "2026-06-01T09:10:00+09:00"
}
```

### Error Cases

| Status | Message |
|--------|---------|
| 400 | 업로드 파일 또는 문서명이 올바르지 않습니다. |
| 413 | 업로드 가능한 최대 파일 크기를 초과했습니다. |
| 415 | 지원하지 않는 문서 형식입니다. |

## GET /rag-documents/{documentId}/download

업로드된 RAG 원본 문서를 다운로드한다.

- 예외: 이 endpoint는 `ApiResponse<T>`로 감싸지지 않는 raw binary response를 반환한다.
- 프론트는 `blob` 응답으로 처리하고, `Content-Type` 및 `Content-Disposition` 헤더를 사용해 다운로드를 구성한다.

### Path

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | string | true | RAG 문서 ID |

### Response

- `Content-Type`: 원본 문서 MIME 타입
- `Content-Disposition`: `attachment; filename="{originalFileName}"`

## DELETE /rag-documents/{documentId}

RAG 문서와 연결된 인덱스 데이터를 삭제한다.

### Path

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | string | true | RAG 문서 ID |

### Response Data

```json
null
```

## Error Cases

| Status | Message |
|--------|---------|
| 400 | 조회 조건이 올바르지 않습니다. |
| 400 | 조회 기간은 최대 90일을 초과할 수 없습니다. |
| 400 | 예산 또는 알림 임계치가 허용 범위를 벗어났습니다. |
| 401 | 인증이 필요합니다. |
| 403 | 관리자 권한이 필요합니다. |
| 500 | AI 매트릭스 조회 중 오류가 발생했습니다. |
