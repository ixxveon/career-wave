# API Schema: scraping

> `scraping` 관리자 외부 API 계약 문서다.  
> Spring Boot는 외부 관리자 API, 인증/인가, DTO 계약, `ApiResponse<T>` 래핑을 담당하고, 실제 스크래핑 실행과 상태 갱신은 FastAPI에 위임한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- 모든 외부 API 응답은 `ApiResponse<T>`를 사용한다.
- 목록 조회 API의 `page`는 1-based다.
- Spring 내부 `Pageable` 변환 시에만 `page - 1`을 적용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서에는 `scraping` 도메인 ErrorCode만 작성한다.

### 권한 표기

- 문서상 권한 표기는 `MASTER`, `BACKEND`만 사용한다.
- Spring Security에서는 `MASTER -> ROLE_MASTER`, `BACKEND -> ROLE_BACKEND`로 매핑한다.

### Pagination 규칙

- 목록 조회 API만 `page`, `size`를 사용한다.
- 상세 조회 API는 `page`, `size`를 사용하지 않는다.
- 실행/재시도/테스트/일괄 실행 API는 `page`, `size`를 사용하지 않는다.

### Spring API ↔ FastAPI 내부 API 매핑

| Spring API | FastAPI Internal API | 설명 |
|---|---|---|
| `GET /api/v1/admin/scraping/pipelines` | `GET /internal/scraping/pipelines` | 파이프라인 목록 조회 |
| `GET /api/v1/admin/scraping/pipelines/summary` | `GET /internal/scraping/pipelines/summary` | 파이프라인 요약 조회 |
| `GET /api/v1/admin/scraping/pipelines/{sourceName}` | `GET /internal/scraping/pipelines/{sourceName}` | 파이프라인 상세 조회 |
| `GET /api/v1/admin/scraping/logs` | `GET /internal/scraping/logs` | 스크래핑 실행 로그 조회 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/run` | 단일 실행 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/retry` | 단일 재시도 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/test` | 단일 테스트 실행 |
| `POST /api/v1/admin/scraping/pipelines/batch-actions` | `POST /internal/scraping/pipelines/batch-run` | 일괄 액션 실행 |

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
  "message": "스크래핑 파이프라인을 찾을 수 없습니다.",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | 기준 |
|---|---|---|
| `ScrapingPipelineStatusType` | `IDLE`, `RUNNING`, `SUCCESS`, `FAILED` | `scraping_pipelines.pipeline_status` |
| `ScrapingStatusType` | `SUCCESS`, `FAILED` | `scraping_logs.scraping_status` |
| `ScrapingActionType` | `RUN`, `RETRY`, `TEST` | 요청 Body 전용 계약 |

---

## 3. Query Parameter → ERD 컬럼 매핑

### GET /api/v1/admin/scraping/pipelines

| Query Parameter | Type | ERD 컬럼 | 설명 |
|---|---|---|---|
| `keyword` | `string` | FastAPI 내부 조회 기준 `scraping_pipelines.source_name`, `scraping_pipelines.display_name`, `scraping_pipelines.last_error_message` | 검색어 |
| `status` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | FastAPI 내부 조회 기준 `scraping_pipelines.pipeline_status` | 파이프라인 상태 |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

### GET /api/v1/admin/scraping/logs

| Query Parameter | Type | ERD 컬럼 | 설명 |
|---|---|---|---|
| `sourceName` | `string` | FastAPI 내부 조회 기준 `scraping_pipelines.source_name` | 파이프라인 소스명 |
| `status` | `SUCCESS \| FAILED` | FastAPI 내부 조회 기준 `scraping_logs.scraping_status` | 실행 결과 상태 |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

> 파이프라인 목록/요약/상세/로그 조회 결과는 FastAPI 내부 API 응답을 기준으로 하며, Spring Repository가 직접 집계하지 않는다.

---

## 4. 파이프라인 API

### 4.1 GET /api/v1/admin/scraping/pipelines

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | N | 검색어 |
| `status` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | N | 파이프라인 상태 |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponsePipelinePage>`

```json
{
  "success": true,
  "message": "스크래핑 파이프라인 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "scrapingPipelineId": 1,
        "sourceName": "wanted",
        "displayName": "원티드",
        "pipelineStatus": "SUCCESS",
        "isEnabled": true,
        "lastStartedAt": "2026-06-11T00:00:00Z",
        "lastSuccessAt": "2026-06-11T00:01:10Z",
        "lastFailedAt": null,
        "lastDurationMs": 70000,
        "lastTotalCount": 132,
        "lastErrorMessage": null,
        "createdAt": "2026-06-01T00:00:00Z",
        "updatedAt": "2026-06-11T00:01:10Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Error Response

없음

---

### 4.2 GET /api/v1/admin/scraping/pipelines/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines/summary`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "스크래핑 파이프라인 요약 조회에 성공했습니다.",
  "data": {
    "totalCount": 4,
    "idleCount": 1,
    "runningCount": 1,
    "successCount": 1,
    "failedCount": 1,
    "enabledCount": 4,
    "disabledCount": 0
  }
}
```

#### Error Response

없음

---

### 4.3 GET /api/v1/admin/scraping/pipelines/{sourceName}

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines/{sourceName}`
- **Auth**: `MASTER`, `BACKEND`

#### Path Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | Y | 파이프라인 소스명 |

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseDetail>`

```json
{
  "success": true,
  "message": "스크래핑 파이프라인 상세 조회에 성공했습니다.",
  "data": {
    "scrapingPipelineId": 1,
    "sourceName": "wanted",
    "displayName": "원티드",
    "pipelineStatus": "FAILED",
    "isEnabled": true,
    "lastStartedAt": "2026-06-11T00:00:00Z",
    "lastSuccessAt": "2026-06-10T00:01:05Z",
    "lastFailedAt": "2026-06-11T00:00:55Z",
    "lastDurationMs": 55000,
    "lastTotalCount": 0,
    "lastErrorMessage": "Timeout while fetching source page.",
    "createdAt": "2026-06-01T00:00:00Z",
    "updatedAt": "2026-06-11T00:00:55Z"
  }
}
```

#### Error Response

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | 파이프라인이 존재하지 않는다. |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | FastAPI가 지원하지 않는 `sourceName`이다. |

---

### 4.4 POST /api/v1/admin/scraping/pipelines/{sourceName}/actions

- **Method**: `POST`
- **Path**: `/api/v1/admin/scraping/pipelines/{sourceName}/actions`
- **Auth**: `MASTER`, `BACKEND`

#### Path Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | Y | 액션 대상 파이프라인 소스명 |

#### Query Parameter

없음

#### Request Body

- Request DTO: `ScrapingPipelineDTO.RequestAction`

```json
{
  "actionType": "RUN",
  "reason": "긴급 점검 후 수동 재실행"
}
```

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseAction>`

```json
{
  "success": true,
  "message": "스크래핑 파이프라인 액션 요청에 성공했습니다.",
  "data": {
    "sourceName": "wanted",
    "requestedAction": "RUN",
    "accepted": true,
    "runId": "run_20260611_000001",
    "requestedAt": "2026-06-11T00:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | 파이프라인이 존재하지 않는다. |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | FastAPI가 지원하지 않는 `sourceName`이다. |
| `SCRAPING_ALREADY_RUNNING` | 409 | 이미 실행 중인 파이프라인이다. |
| `SCRAPING_EXECUTION_FAILED` | 500 | 실행 또는 재시도 요청 처리에 실패했다. |
| `SCRAPING_TEST_FAILED` | 500 | 테스트 실행 요청 처리에 실패했다. |

---

### 4.5 POST /api/v1/admin/scraping/pipelines/batch-actions

- **Method**: `POST`
- **Path**: `/api/v1/admin/scraping/pipelines/batch-actions`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

없음

#### Request Body

- Request DTO: `ScrapingPipelineDTO.RequestBatchAction`

```json
{
  "actionType": "RETRY",
  "reason": "배치 재시도 요청",
  "sourceNames": [
    "wanted",
    "saramin"
  ]
}
```

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseBatchAction>`

```json
{
  "success": true,
  "message": "스크래핑 파이프라인 일괄 액션 요청에 성공했습니다.",
  "data": {
    "requestedCount": 2,
    "acceptedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "sourceName": "wanted",
        "accepted": true,
        "message": "실행 요청이 접수되었습니다."
      },
      {
        "sourceName": "saramin",
        "accepted": true,
        "message": "실행 요청이 접수되었습니다."
      }
    ]
  }
}
```

#### Error Response

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | 요청 목록에 미지원 `sourceName`이 포함되어 있다. |
| `SCRAPING_ALREADY_RUNNING` | 409 | 요청 목록 중 이미 실행 중인 파이프라인이 있다. |
| `SCRAPING_EXECUTION_FAILED` | 500 | 실행 또는 재시도 요청 처리에 실패했다. |
| `SCRAPING_TEST_FAILED` | 500 | 테스트 실행 요청 처리에 실패했다. |

---

## 5. 스크래핑 실행 로그 API

### 5.1 GET /api/v1/admin/scraping/logs

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/logs`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | N | 파이프라인 소스명 |
| `status` | `SUCCESS \| FAILED` | N | 실행 결과 상태 |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<ScrapingLogDTO.ResponseLogPage>`

```json
{
  "success": true,
  "message": "스크래핑 실행 로그 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "logId": "101",
        "occurredAt": "2026-06-11T00:01:10Z",
        "sourceName": "wanted",
        "status": "SUCCESS",
        "message": "스크래핑 실행이 성공했습니다.",
        "detail": null,
        "runId": "run_20260611_000001"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Error Response

없음

---

## 6. DTO 계약

### 6.1 `ScrapingPipelineDTO.RequestAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `actionType` | `RUN \| RETRY \| TEST` | Y | 없음 | 단일 파이프라인 액션 유형 |
| `reason` | `string` | Y | 없음 | 액션 요청 사유 |

### 6.2 `ScrapingPipelineDTO.RequestBatchAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `actionType` | `RUN \| RETRY \| TEST` | Y | 없음 | 일괄 액션 유형 |
| `reason` | `string` | Y | 없음 | 일괄 액션 요청 사유 |
| `sourceNames` | `string[]` | Y | 없음 | 액션 대상 `sourceName` 목록 |

### 6.3 `ScrapingPipelineDTO.ResponsePipelineItem`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `scrapingPipelineId` | `number` | Y | FastAPI 응답 기준 `scraping_pipelines.scraping_pipeline_id` | 파이프라인 ID |
| `sourceName` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.source_name` | 소스명 |
| `displayName` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.display_name` | 표시명 |
| `pipelineStatus` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | Y | FastAPI 응답 기준 `scraping_pipelines.pipeline_status` | 파이프라인 상태 |
| `isEnabled` | `boolean` | Y | FastAPI 응답 기준 `scraping_pipelines.is_enabled` | 활성 여부 |
| `lastStartedAt` | `string` | N | FastAPI 응답 기준 `scraping_pipelines.last_started_at` | 최근 시작 시각 |
| `lastSuccessAt` | `string` | N | FastAPI 응답 기준 `scraping_pipelines.last_success_at` | 최근 성공 시각 |
| `lastFailedAt` | `string` | N | FastAPI 응답 기준 `scraping_pipelines.last_failed_at` | 최근 실패 시각 |
| `lastDurationMs` | `number` | N | FastAPI 응답 기준 `scraping_pipelines.last_duration_ms` | 최근 실행 시간 |
| `lastTotalCount` | `number` | N | FastAPI 응답 기준 `scraping_pipelines.last_total_count` | 최근 수집 건수 |
| `lastErrorMessage` | `string` | N | FastAPI 응답 기준 `scraping_pipelines.last_error_message` | 최근 오류 메시지 |
| `createdAt` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.updated_at` | 수정 시각 |

### 6.4 `ScrapingPipelineDTO.ResponseSummary`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `totalCount` | `number` | Y | FastAPI 집계 응답 | 전체 수 |
| `idleCount` | `number` | Y | FastAPI 집계 응답 | IDLE 수 |
| `runningCount` | `number` | Y | FastAPI 집계 응답 | RUNNING 수 |
| `successCount` | `number` | Y | FastAPI 집계 응답 | SUCCESS 수 |
| `failedCount` | `number` | Y | FastAPI 집계 응답 | FAILED 수 |
| `enabledCount` | `number` | Y | FastAPI 집계 응답 | 활성 수 |
| `disabledCount` | `number` | Y | FastAPI 집계 응답 | 비활성 수 |

### 6.5 `ScrapingPipelineDTO.ResponseAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `sourceName` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.source_name` | 대상 소스명 |
| `requestedAction` | `RUN \| RETRY \| TEST` | Y | 없음 | 요청한 액션 유형 |
| `accepted` | `boolean` | Y | 없음 | 접수 여부 |
| `runId` | `string` | N | FastAPI 실행 요청 run identifier | 접수된 실행 ID |
| `requestedAt` | `string` | Y | 없음 | 요청 시각 |

### 6.6 `ScrapingPipelineDTO.ResponseBatchAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `requestedCount` | `number` | Y | 없음 | 요청 대상 수 |
| `acceptedCount` | `number` | Y | 없음 | 접수 수 |
| `failedCount` | `number` | Y | 없음 | 실패 수 |
| `results` | `array` | Y | 없음 | 대상별 접수 결과 |
| `results[].sourceName` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.source_name` | 대상 소스명 |
| `results[].accepted` | `boolean` | Y | 없음 | 접수 여부 |
| `results[].message` | `string` | Y | 없음 | 접수 결과 메시지 |

### 6.7 `ScrapingLogDTO.ResponseLogItem`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `logId` | `string` | Y | FastAPI 응답 기준 `scraping_logs.scraping_log_id` | 로그 ID |
| `occurredAt` | `string` | Y | FastAPI 응답 기준 `scraping_logs.executed_at` | 실행 시각 |
| `sourceName` | `string` | Y | FastAPI 응답 기준 `scraping_pipelines.source_name` | 소스명 |
| `status` | `SUCCESS \| FAILED` | Y | FastAPI 응답 기준 `scraping_logs.scraping_status` | 실행 결과 상태 |
| `message` | `string` | Y | FastAPI 실행 결과 메시지 | 요약 메시지 |
| `detail` | `string` | N | FastAPI 응답 기준 `scraping_logs.error_message` | 상세 메시지 |
| `runId` | `string` | N | FastAPI 실행 run identifier | 실행 ID |

---

## 7. ErrorCode 계약

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | 파이프라인이 존재하지 않는다. |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | 지원하지 않는 `sourceName`이다. |
| `SCRAPING_ALREADY_RUNNING` | 409 | 이미 실행 중인 파이프라인이다. |
| `SCRAPING_EXECUTION_FAILED` | 500 | 실행 또는 재시도 요청 처리에 실패했다. |
| `SCRAPING_TEST_FAILED` | 500 | 테스트 실행 요청 처리에 실패했다. |

### FastAPI ErrorCode → Spring ErrorCode 매핑

| FastAPI ErrorCode | Spring ErrorCode | 설명 |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | `SCRAPING_PIPELINE_NOT_FOUND` | 파이프라인 없음 |
| `SCRAPING_SOURCE_NOT_FOUND` | `SCRAPING_SOURCE_NOT_FOUND` | 미지원 sourceName |
| `SCRAPING_ALREADY_RUNNING` | `SCRAPING_ALREADY_RUNNING` | 이미 실행 중 |
| `SCRAPING_EXECUTION_FAILED` | `SCRAPING_EXECUTION_FAILED` | 실행 실패 |
| `SCRAPING_TEST_FAILED` | `SCRAPING_TEST_FAILED` | 테스트 실행 실패 |
| `FASTAPI_INTERNAL_ERROR` | `SCRAPING_EXECUTION_FAILED` | FastAPI 내부 처리 실패 |
| `DISCORD_ALERT_SEND_FAILED` | `SCRAPING_EXECUTION_FAILED` | 선택 기능인 실패 알림 전송 실패 |
