# API Schema: 관리자 스크래핑 관리

## 공통 규칙

- Base Path: `/api/admin/scraping`
- Auth: Bearer Token
- Role: `ROLE_ADMIN`
- Response: `ApiResponse<T>`
- 날짜 형식: ISO 8601
- 실제 수집 실행은 백엔드 또는 FastAPI 파이프라인이 담당하고, 프론트엔드는 관리자 API를 통해 상태 조회와 제어 요청만 수행한다.

## 공통 타입

```ts
type ScrapingPipelineStatus = 'ACTIVE' | 'WARNING' | 'FAILED' | 'RECOVERING' | 'PAUSED';
type ScrapingLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
type ScrapingActionType = 'RUN' | 'RETRY' | 'TEST' | 'PAUSE' | 'RESUME';
```

## GET /pipelines

스크래핑 파이프라인 목록을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `keyword` | string | false | source 또는 최근 오류 검색어 |
| `status` | ScrapingPipelineStatus | false | 상태 필터 |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 10 |

### Response Data

```json
{
  "content": [
    {
      "pipelineId": "PL-001",
      "sourceName": "Wanted Feed",
      "status": "ACTIVE",
      "successRate": 97.4,
      "averageDurationMs": 1380,
      "cycleExpression": "*/10m",
      "collectedCount": 1184,
      "recentErrorCode": null,
      "recentErrorMessage": null,
      "live": true,
      "lastStartedAt": "2026-06-01T08:50:00+09:00",
      "lastFinishedAt": "2026-06-01T08:51:20+09:00",
      "updatedAt": "2026-06-01T09:00:00+09:00"
    }
  ],
  "page": 1,
  "size": 10,
  "totalElements": 6,
  "totalPages": 1
}
```

## GET /pipelines/summary

스크래핑 파이프라인 요약 정보를 조회한다.

### Response Data

```json
{
  "totalPipelines": 6,
  "activeCount": 2,
  "warningCount": 2,
  "failedCount": 1,
  "recoveringCount": 1,
  "pausedCount": 0,
  "totalCollectedCount": 4403,
  "averageSuccessRate": 77.4,
  "averageDurationMs": 2301,
  "lastSyncedAt": "2026-06-01T09:00:00+09:00"
}
```

## GET /pipelines/{pipelineId}

단일 파이프라인 상세 상태를 조회한다.

### Path

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pipelineId` | string | true | 파이프라인 ID |

### Response Data

```json
{
  "pipelineId": "PL-002",
  "sourceName": "Saramin DOM",
  "status": "FAILED",
  "successRate": 12.4,
  "averageDurationMs": 4810,
  "cycleExpression": "*/5m",
  "collectedCount": 0,
  "recentErrorCode": "SelectorMismatch",
  "recentErrorMessage": "상세 페이지 selector가 일치하지 않습니다.",
  "lastRunId": "RUN-20260601-001",
  "lastStartedAt": "2026-06-01T08:45:00+09:00",
  "lastFinishedAt": "2026-06-01T08:45:34+09:00"
}
```

## POST /pipelines/{pipelineId}/actions

단일 파이프라인 제어 액션을 요청한다.

### Request

```json
{
  "actionType": "RETRY",
  "reason": "selector 오류 수정 후 재시도"
}
```

### Response Data

```json
{
  "pipelineId": "PL-002",
  "requestedAction": "RETRY",
  "accepted": true,
  "runId": "RUN-20260601-002",
  "nextStatus": "RECOVERING",
  "requestedAt": "2026-06-01T09:03:00+09:00"
}
```

### Rules

- `RUN`: 즉시 수집 실행을 요청한다.
- `RETRY`: 실패한 최근 실행을 기준으로 재시도를 요청한다.
- `TEST`: 실제 저장 없이 selector/schema 검증 실행을 요청한다.
- `PAUSE`: 주기 실행을 중지한다.
- `RESUME`: 중지된 파이프라인을 다시 활성화한다.

## POST /pipelines/actions

선택된 여러 파이프라인에 동일 액션을 요청한다.

### Request

```json
{
  "pipelineIds": ["PL-001", "PL-002"],
  "actionType": "PAUSE",
  "reason": "외부 사이트 점검 대응"
}
```

### Response Data

```json
{
  "requestedCount": 2,
  "acceptedCount": 2,
  "failedCount": 0,
  "results": [
    {
      "pipelineId": "PL-001",
      "accepted": true,
      "message": "중지 요청이 접수되었습니다."
    }
  ]
}
```

## GET /logs

스크래핑 운영 로그를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pipelineId` | string | false | 특정 파이프라인 필터 |
| `level` | ScrapingLogLevel | false | 로그 등급 필터 |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 20 |

### Response Data

```json
{
  "content": [
    {
      "logId": "LOG-001",
      "occurredAt": "2026-06-01T09:02:13+09:00",
      "pipelineId": "PL-002",
      "sourceName": "Saramin DOM",
      "level": "ERROR",
      "message": "셀렉터 매칭 실패",
      "detail": "DOM 구조 변경으로 상세 페이지 수집이 중단되었습니다.",
      "runId": "RUN-20260601-001"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 35,
  "totalPages": 2
}
```

## Error Cases

| Status | Message |
|--------|---------|
| 400 | 요청 값이 올바르지 않습니다. |
| 401 | 인증이 필요합니다. |
| 403 | 관리자 권한이 필요합니다. |
| 404 | 파이프라인을 찾을 수 없습니다. |
| 409 | 현재 상태에서 수행할 수 없는 액션입니다. |
| 500 | 스크래핑 상태 조회 중 오류가 발생했습니다. |
