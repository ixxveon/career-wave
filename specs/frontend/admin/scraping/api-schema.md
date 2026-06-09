# API Schema: 관리자 스크래핑 관리

## 공통 규칙

- Base Path: `/api/v1/admin/scraping`
- Auth: Bearer Token
- Role: See `Permissions`.
- Response: `ApiResponse<T>`

## Permissions

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`, `USER`를 사용한다. Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`, `ROLE_USER`로 매핑한다.

| Method | Path | Allowed Roles |
|---|---|---|
| GET | `/api/v1/admin/scraping/pipelines` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/scraping/pipelines/summary` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/scraping/pipelines/{sourceName}` | `MASTER`, `BACKEND` |
| POST | `/api/v1/admin/scraping/pipelines/{sourceName}/actions` | `MASTER`, `BACKEND` |
| POST | `/api/v1/admin/scraping/pipelines/batch-actions` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/scraping/logs` | `MASTER`, `BACKEND` |

- 날짜 형식: ISO 8601
- 실제 수집 실행은 백엔드 또는 FastAPI 파이프라인이 담당하고, 프론트엔드는 관리자 API를 통해 상태 조회와 제어 요청만 수행한다.

## 공통 타입

```ts
type ScrapingStatus = 'SUCCESS' | 'FAILED';
type ScrapingActionType = 'RUN' | 'RETRY' | 'TEST';
```

- `ScrapingStatus`는 ERD `scraping_logs.scraping_status` CHECK 제약(`SUCCESS`, `FAILED`)과 동일한 값을 사용한다.
- 현재 ERD에는 별도 파이프라인 테이블과 `pipelineId`, `ACTIVE`, `WARNING`, `RECOVERING`, `PAUSED` 상태가 없으므로 API 계약에서 가정하지 않는다.
- 화면의 "주의", "복구 중", "중지" 같은 표현이 필요하면 백엔드 DDL 확정 후 별도 상태 필드로 추가한다.
- `cycleExpression`은 cron이 아닌 커스텀 interval 문자열이다. 허용 포맷은 `*/{number}m`, `*/{number}h`이며 `{number}`는 1 이상의 정수다. 예: `*/10m`, `*/2h`.

## GET /pipelines

스크래핑 파이프라인 목록을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `keyword` | string | false | source 또는 최근 오류 검색어 |
| `status` | ScrapingStatus | false | 최근 실행 결과 상태 필터 |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 10 |

### Response Data

```json
{
  "content": [
    {
      "sourceName": "Wanted Feed",
      "status": "SUCCESS",
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
  "totalSources": 6,
  "successCount": 5,
  "failedCount": 1,
  "totalCollectedCount": 4403,
  "averageSuccessRate": 77.4,
  "averageDurationMs": 2301,
  "lastSyncedAt": "2026-06-01T09:00:00+09:00"
}
```

## GET /pipelines/{sourceName}

단일 source의 상세 상태를 조회한다.

### Path

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sourceName` | string | true | ERD와 API에서 공통으로 식별 가능한 수집 source명 |

### Response Data

```json
{
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

## POST /pipelines/{sourceName}/actions

단일 source 기준 실행 액션을 요청한다.

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
  "sourceName": "Saramin DOM",
  "requestedAction": "RETRY",
  "accepted": true,
  "runId": "RUN-20260601-002",
  "requestedAt": "2026-06-01T09:03:00+09:00"
}
```

### Rules

- `RUN`: 즉시 수집 실행을 요청한다.
- `RETRY`: 실패한 최근 실행을 기준으로 재시도를 요청한다.
- `TEST`: 실제 저장 없이 selector/schema 검증 실행을 요청한다.

## POST /pipelines/batch-actions

선택된 여러 source에 동일 액션을 요청한다.

### Request

```json
{
  "sourceNames": ["Wanted Feed", "Saramin DOM"],
  "actionType": "TEST",
  "reason": "외부 사이트 DOM 변경 여부 확인"
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
      "sourceName": "Wanted Feed",
      "accepted": true,
      "message": "테스트 요청이 접수되었습니다."
    }
  ]
}
```

## GET /logs

스크래핑 운영 로그를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sourceName` | string | false | 특정 source 필터 |
| `status` | ScrapingStatus | false | ERD `scraping_status` 기준 필터 |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 20 |

### Response Data

```json
{
  "content": [
    {
      "logId": "LOG-001",
      "occurredAt": "2026-06-01T09:02:13+09:00",
      "sourceName": "Saramin DOM",
      "status": "FAILED",
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
