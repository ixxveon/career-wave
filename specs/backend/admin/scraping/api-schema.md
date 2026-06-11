# API Schema: scraping

> `scraping` ê´€ë¦¬ì ?¸ë? API ê³„ì•½ ë¬¸ì„œ??  
> Spring Boot???¸ë? ê´€ë¦¬ì API, ?¸ì¦/?¸ê?, DTO ê³„ì•½, `ApiResponse<T>` ?˜í•‘???´ë‹¹?˜ê³ , ?¤ì œ ?¤í¬?˜í•‘ ?¤í–‰ê³??íƒœ ê°±ì‹ ?€ FastAPI???„ì„?œë‹¤.

---

## 1. ê³µí†µ ê·œì¹™

- ?„ë¡œ?íŠ¸ êµ¬ì¡°: Spring Boot + PostgreSQL + React
- ëª¨ë“  ?¸ë? API ?‘ë‹µ?€ `ApiResponse<T>`ë¥??¬ìš©?œë‹¤.
- ëª©ë¡ ì¡°íšŒ API??`page`??1-based??
- Spring ?´ë? `Pageable` ë³€???œì—ë§?`page - 1`???ìš©?œë‹¤.
- Swagger ?´ë…¸?Œì´?˜ì? Controllerê°€ ?„ë‹ˆ??`docs` ?¸í„°?˜ì´?¤ì— ?‘ì„±?œë‹¤.
- ë³?ë¬¸ì„œ?ëŠ” `scraping` ?„ë©”??ErrorCodeë§??‘ì„±?œë‹¤.

### ê¶Œí•œ ?œê¸°

- ë¬¸ì„œ??ê¶Œí•œ ?œê¸°??`MASTER`, `BACKEND`ë§??¬ìš©?œë‹¤.
- Spring Security?ì„œ??`MASTER -> ROLE_MASTER`, `BACKEND -> ROLE_BACKEND`ë¡?ë§¤í•‘?œë‹¤.

### Pagination ê·œì¹™

- ëª©ë¡ ì¡°íšŒ APIë§?`page`, `size`ë¥??¬ìš©?œë‹¤.
- ?ì„¸ ì¡°íšŒ API??`page`, `size`ë¥??¬ìš©?˜ì? ?ŠëŠ”??
- ?¤í–‰/?¬ì‹œ???ŒìŠ¤???¼ê´„ ?¤í–‰ API??`page`, `size`ë¥??¬ìš©?˜ì? ?ŠëŠ”??

### Spring API ??FastAPI ?´ë? API ë§¤í•‘

| Spring API | FastAPI Internal API | ?¤ëª… |
|---|---|---|
| `GET /api/v1/admin/scraping/pipelines` | `GET /internal/scraping/pipelines` | ?Œì´?„ë¼??ëª©ë¡ ì¡°íšŒ |
| `GET /api/v1/admin/scraping/pipelines/summary` | `GET /internal/scraping/pipelines/summary` | ?Œì´?„ë¼???”ì•½ ì¡°íšŒ |
| `GET /api/v1/admin/scraping/pipelines/{sourceName}` | `GET /internal/scraping/pipelines/{sourceName}` | ?Œì´?„ë¼???ì„¸ ì¡°íšŒ |
| `GET /api/v1/admin/scraping/logs` | `GET /internal/scraping/logs` | ?¤í¬?˜í•‘ ?¤í–‰ ë¡œê·¸ ì¡°íšŒ |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/run` | ?¨ì¼ ?¤í–‰ |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/retry` | ?¨ì¼ ?¬ì‹œ??|
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/test` | ?¨ì¼ ?ŒìŠ¤???¤í–‰ |
| `POST /api/v1/admin/scraping/pipelines/batch-actions` | `POST /internal/scraping/pipelines/batch-run` | ?¼ê´„ ?¡ì…˜ ?¤í–‰ |

### ê³µí†µ ?±ê³µ ?‘ë‹µ ?ˆì‹œ

```json
{
  "success": true,
  "message": "?”ì²­???±ê³µ?ˆìŠµ?ˆë‹¤.",
  "data": {}
}
```

### ê³µí†µ ?˜ì´ì§€ ?‘ë‹µ ?ˆì‹œ

```json
{
  "success": true,
  "message": "?”ì²­???±ê³µ?ˆìŠµ?ˆë‹¤.",
  "data": {
    "content": [],
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

### ê³µí†µ ?¤íŒ¨ ?‘ë‹µ ?ˆì‹œ

```json
{
  "success": false,
  "status": 404,
  "message": "?¤í¬?˜í•‘ ?Œì´?„ë¼?¸ì„ ì°¾ì„ ???†ìŠµ?ˆë‹¤.",
  "data": null
}
```

---

## 2. Enum ê³„ì•½

| Enum | Values | ê¸°ì? |
|---|---|---|
| `ScrapingPipelineStatusType` | `IDLE`, `RUNNING`, `SUCCESS`, `FAILED` | `scraping_pipelines.pipeline_status` |
| `ScrapingStatusType` | `SUCCESS`, `FAILED` | `scraping_logs.scraping_status` |
| `ScrapingActionType` | `RUN`, `RETRY`, `TEST` | ?”ì²­ Body ?„ìš© ê³„ì•½ |

---

## 3. Query Parameter ??ERD ì»¬ëŸ¼ ë§¤í•‘

### GET /api/v1/admin/scraping/pipelines

| Query Parameter | Type | ERD ì»¬ëŸ¼ | ?¤ëª… |
|---|---|---|---|
| `keyword` | `string` | FastAPI ?´ë? ì¡°íšŒ ê¸°ì? `scraping_pipelines.source_name`, `scraping_pipelines.display_name`, `scraping_pipelines.last_error_message` | ê²€?‰ì–´ |
| `status` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | FastAPI ?´ë? ì¡°íšŒ ê¸°ì? `scraping_pipelines.pipeline_status` | ?Œì´?„ë¼???íƒœ |
| `page` | `number` | ?†ìŒ | ?˜ì´ì§€ ë²ˆí˜¸, 1-based |
| `size` | `number` | ?†ìŒ | ?˜ì´ì§€ ?¬ê¸° |

### GET /api/v1/admin/scraping/logs

| Query Parameter | Type | ERD ì»¬ëŸ¼ | ?¤ëª… |
|---|---|---|---|
| `sourceName` | `string` | FastAPI ?´ë? ì¡°íšŒ ê¸°ì? `scraping_pipelines.source_name` | ?Œì´?„ë¼???ŒìŠ¤ëª?|
| `status` | `SUCCESS \| FAILED` | FastAPI ?´ë? ì¡°íšŒ ê¸°ì? `scraping_logs.scraping_status` | ?¤í–‰ ê²°ê³¼ ?íƒœ |
| `page` | `number` | ?†ìŒ | ?˜ì´ì§€ ë²ˆí˜¸, 1-based |
| `size` | `number` | ?†ìŒ | ?˜ì´ì§€ ?¬ê¸° |

> ?Œì´?„ë¼??ëª©ë¡/?”ì•½/?ì„¸/ë¡œê·¸ ì¡°íšŒ ê²°ê³¼??FastAPI ?´ë? API ?‘ë‹µ??ê¸°ì??¼ë¡œ ?˜ë©°, Spring Repositoryê°€ ì§ì ‘ ì§‘ê³„?˜ì? ?ŠëŠ”??

---

## 4. ?Œì´?„ë¼??API

### 4.1 GET /api/v1/admin/scraping/pipelines

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | N | ê²€?‰ì–´ |
| `status` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | N | ?Œì´?„ë¼???íƒœ |
| `page` | `number` | N | ?˜ì´ì§€ ë²ˆí˜¸, 1-based |
| `size` | `number` | N | ?˜ì´ì§€ ?¬ê¸° |

#### Request Body

- Request DTO: ?†ìŒ

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponsePipelinePage>`

```json
{
  "success": true,
  "message": "?¤í¬?˜í•‘ ?Œì´?„ë¼??ëª©ë¡ ì¡°íšŒ???±ê³µ?ˆìŠµ?ˆë‹¤.",
  "data": {
    "content": [
      {
        "scrapingPipelineId": 1,
        "sourceName": "wanted",
        "displayName": "?í‹°??,
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

?†ìŒ

---

### 4.2 GET /api/v1/admin/scraping/pipelines/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines/summary`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

?†ìŒ

#### Request Body

- Request DTO: ?†ìŒ

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "?¤í¬?˜í•‘ ?Œì´?„ë¼???”ì•½ ì¡°íšŒ???±ê³µ?ˆìŠµ?ˆë‹¤.",
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

?†ìŒ

---

### 4.3 GET /api/v1/admin/scraping/pipelines/{sourceName}

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/pipelines/{sourceName}`
- **Auth**: `MASTER`, `BACKEND`

#### Path Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | Y | ?Œì´?„ë¼???ŒìŠ¤ëª?|

#### Query Parameter

?†ìŒ

#### Request Body

- Request DTO: ?†ìŒ

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseDetail>`

```json
{
  "success": true,
  "message": "?¤í¬?˜í•‘ ?Œì´?„ë¼???ì„¸ ì¡°íšŒ???±ê³µ?ˆìŠµ?ˆë‹¤.",
  "data": {
    "scrapingPipelineId": 1,
    "sourceName": "wanted",
    "displayName": "?í‹°??,
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
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | ?Œì´?„ë¼?¸ì´ ì¡´ì¬?˜ì? ?ŠëŠ”?? |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | FastAPIê°€ ì§€?í•˜ì§€ ?ŠëŠ” `sourceName`?´ë‹¤. |

---

### 4.4 POST /api/v1/admin/scraping/pipelines/{sourceName}/actions

- **Method**: `POST`
- **Path**: `/api/v1/admin/scraping/pipelines/{sourceName}/actions`
- **Auth**: `MASTER`, `BACKEND`

#### Path Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | Y | ?¡ì…˜ ?€???Œì´?„ë¼???ŒìŠ¤ëª?|

#### Query Parameter

?†ìŒ

#### Request Body

- Request DTO: `ScrapingPipelineDTO.RequestAction`

```json
{
  "actionType": "RUN",
  "reason": "±ä±Ş Á¡°Ë ÈÄ ¼öµ¿ Àç½ÇÇà"
}
```

#### Response Body

- Response DTO: `ApiResponse<ScrapingPipelineDTO.ResponseAction>`

```json
{
  "success": true,
  "message": "½ºÅ©·¡ÇÎ ÆÄÀÌÇÁ¶óÀÎ ¾×¼Ç ¿äÃ»¿¡ ¼º°øÇß½À´Ï´Ù.",
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
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | ?Œì´?„ë¼?¸ì´ ì¡´ì¬?˜ì? ?ŠëŠ”?? |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | FastAPIê°€ ì§€?í•˜ì§€ ?ŠëŠ” `sourceName`?´ë‹¤. |
| `SCRAPING_ALREADY_RUNNING` | 409 | ?´ë? ?¤í–‰ ì¤‘ì¸ ?Œì´?„ë¼?¸ì´?? |
| `SCRAPING_EXECUTION_FAILED` | 500 | ?¤í–‰ ?ëŠ” ?¬ì‹œ???”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |
| `SCRAPING_TEST_FAILED` | 500 | ?ŒìŠ¤???¤í–‰ ?”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |

---

### 4.5 POST /api/v1/admin/scraping/pipelines/batch-actions

- **Method**: `POST`
- **Path**: `/api/v1/admin/scraping/pipelines/batch-actions`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

?†ìŒ

#### Request Body

- Request DTO: `ScrapingPipelineDTO.RequestBatchAction`
```json
{
  "actionType": "RETRY",
  "reason": "¹èÄ¡ Àç½Ãµµ ¿äÃ»",
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
  "message": "½ºÅ©·¡ÇÎ ÆÄÀÌÇÁ¶óÀÎ ÀÏ°ı ¾×¼Ç ¿äÃ»¿¡ ¼º°øÇß½À´Ï´Ù.",
  "data": {
    "requestedCount": 2,
    "acceptedCount": 2,
    "failedCount": 0,
    "results": [
      {
        "sourceName": "wanted",
        "accepted": true,
        "message": "½ÇÇà ¿äÃ»ÀÌ Á¢¼öµÇ¾ú½À´Ï´Ù."
      },
      {
        "sourceName": "saramin",
        "accepted": true,
        "message": "½ÇÇà ¿äÃ»ÀÌ Á¢¼öµÇ¾ú½À´Ï´Ù."
      }
    ]
  }
}
```
```

#### Error Response

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | ?”ì²­ ëª©ë¡??ë¯¸ì???`sourceName`???¬í•¨?˜ì–´ ?ˆë‹¤. |
| `SCRAPING_ALREADY_RUNNING` | 409 | ?”ì²­ ëª©ë¡ ì¤??´ë? ?¤í–‰ ì¤‘ì¸ ?Œì´?„ë¼?¸ì´ ?ˆë‹¤. |
| `SCRAPING_EXECUTION_FAILED` | 500 | ?¤í–‰ ?ëŠ” ?¬ì‹œ???”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |
| `SCRAPING_TEST_FAILED` | 500 | ?ŒìŠ¤???¤í–‰ ?”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |

---

## 5. ?¤í¬?˜í•‘ ?¤í–‰ ë¡œê·¸ API

### 5.1 GET /api/v1/admin/scraping/logs

- **Method**: `GET`
- **Path**: `/api/v1/admin/scraping/logs`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | N | ?Œì´?„ë¼???ŒìŠ¤ëª?|
| `status` | `SUCCESS \| FAILED` | N | ?¤í–‰ ê²°ê³¼ ?íƒœ |
| `page` | `number` | N | ?˜ì´ì§€ ë²ˆí˜¸, 1-based |
| `size` | `number` | N | ?˜ì´ì§€ ?¬ê¸° |

#### Request Body

- Request DTO: ?†ìŒ

#### Response Body

- Response DTO: `ApiResponse<ScrapingLogDTO.ResponseLogPage>`
```json
{
  "success": true,
  "message": "½ºÅ©·¡ÇÎ ½ÇÇà ·Î±× Á¶È¸¿¡ ¼º°øÇß½À´Ï´Ù.",
  "data": {
    "content": [
      {
        "logId": "101",
        "occurredAt": "2026-06-11T00:01:10Z",
        "sourceName": "wanted",
        "status": "SUCCESS",
        "message": "½ºÅ©·¡ÇÎ ½ÇÇàÀÌ ¼º°øÇß½À´Ï´Ù.",
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

¾øÀ½

---

## 6. DTO °è¾à

### 6.1 `ScrapingPipelineDTO.RequestAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `actionType` | `RUN \| RETRY \| TEST` | Y | ¾øÀ½ | ´ÜÀÏ ÆÄÀÌÇÁ¶óÀÎ ¾×¼Ç À¯Çü |
| `reason` | `string` | Y | ¾øÀ½ | ¾×¼Ç ¿äÃ» »çÀ¯ |

### 6.2 `ScrapingPipelineDTO.RequestBatchAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `actionType` | `RUN \| RETRY \| TEST` | Y | ¾øÀ½ | ÀÏ°ı ¾×¼Ç À¯Çü |
| `reason` | `string` | Y | ¾øÀ½ | ÀÏ°ı ¾×¼Ç ¿äÃ» »çÀ¯ |
| `sourceNames` | `string[]` | Y | ¾øÀ½ | ¾×¼Ç ´ë»ó `sourceName` ¸ñ·Ï |

### 6.3 `ScrapingPipelineDTO.ResponsePipelineItem`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `scrapingPipelineId` | `number` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.scraping_pipeline_id` | ÆÄÀÌÇÁ¶óÀÎ ID |
| `sourceName` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.source_name` | ¼Ò½º¸í |
| `displayName` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.display_name` | Ç¥½Ã¸í |
| `pipelineStatus` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.pipeline_status` | ÆÄÀÌÇÁ¶óÀÎ »óÅÂ |
| `isEnabled` | `boolean` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.is_enabled` | È°¼º ¿©ºÎ |
| `lastStartedAt` | `string` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_started_at` | ÃÖ±Ù ½ÃÀÛ ½Ã°¢ |
| `lastSuccessAt` | `string` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_success_at` | ÃÖ±Ù ¼º°ø ½Ã°¢ |
| `lastFailedAt` | `string` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_failed_at` | ÃÖ±Ù ½ÇÆĞ ½Ã°¢ |
| `lastDurationMs` | `number` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_duration_ms` | ÃÖ±Ù ½ÇÇà ½Ã°£ |
| `lastTotalCount` | `number` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_total_count` | ÃÖ±Ù ¼öÁı °Ç¼ö |
| `lastErrorMessage` | `string` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.last_error_message` | ÃÖ±Ù ¿À·ù ¸Ş½ÃÁö |
| `createdAt` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.created_at` | »ı¼º ½Ã°¢ |
| `updatedAt` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.updated_at` | ¼öÁ¤ ½Ã°¢ |

### 6.4 `ScrapingPipelineDTO.ResponseSummary`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `totalCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | ÀüÃ¼ ¼ö |
| `idleCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | IDLE ¼ö |
| `runningCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | RUNNING ¼ö |
| `successCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | SUCCESS ¼ö |
| `failedCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | FAILED ¼ö |
| `enabledCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | È°¼º ¼ö |
| `disabledCount` | `number` | Y | FastAPI Áı°è ÀÀ´ä | ºñÈ°¼º ¼ö |

### 6.5 `ScrapingPipelineDTO.ResponseAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `sourceName` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.source_name` | ´ë»ó ¼Ò½º¸í |
| `requestedAction` | `RUN \| RETRY \| TEST` | Y | ¾øÀ½ | ¿äÃ»ÇÑ ¾×¼Ç À¯Çü |
| `accepted` | `boolean` | Y | ¾øÀ½ | Á¢¼ö ¿©ºÎ |
| `runId` | `string` | N | FastAPI ½ÇÇà ¿äÃ» run identifier | Á¢¼öµÈ ½ÇÇà ID |
| `requestedAt` | `string` | Y | ¾øÀ½ | ¿äÃ» ½Ã°¢ |

### 6.6 `ScrapingPipelineDTO.ResponseBatchAction`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `requestedCount` | `number` | Y | ¾øÀ½ | ¿äÃ» ´ë»ó ¼ö |
| `acceptedCount` | `number` | Y | ¾øÀ½ | Á¢¼ö ¼ö |
| `failedCount` | `number` | Y | ¾øÀ½ | ½ÇÆĞ ¼ö |
| `results` | `array` | Y | ¾øÀ½ | ´ë»óº° Á¢¼ö °á°ú |
| `results[].sourceName` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.source_name` | ´ë»ó ¼Ò½º¸í |
| `results[].accepted` | `boolean` | Y | ¾øÀ½ | Á¢¼ö ¿©ºÎ |
| `results[].message` | `string` | Y | ¾øÀ½ | Á¢¼ö °á°ú ¸Ş½ÃÁö |

### 6.7 `ScrapingLogDTO.ResponseLogItem`

| Field | Type | Required | Mapping | Description |
|---|---|---|---|---|
| `logId` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_logs.scraping_log_id` | ·Î±× ID |
| `occurredAt` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_logs.executed_at` | ½ÇÇà ½Ã°¢ |
| `sourceName` | `string` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_pipelines.source_name` | ¼Ò½º¸í |
| `status` | `SUCCESS \| FAILED` | Y | FastAPI ÀÀ´ä ±âÁØ `scraping_logs.scraping_status` | ½ÇÇà °á°ú »óÅÂ |
| `message` | `string` | Y | FastAPI ½ÇÇà °á°ú ¸Ş½ÃÁö | ¿ä¾à ¸Ş½ÃÁö |
| `detail` | `string` | N | FastAPI ÀÀ´ä ±âÁØ `scraping_logs.error_message` | »ó¼¼ ¸Ş½ÃÁö |
| `runId` | `string` | N | FastAPI ½ÇÇà run identifier | ½ÇÇà ID |

---
---

## 7. ErrorCode ê³„ì•½

| ErrorCode | Status | Description |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | 404 | ?Œì´?„ë¼?¸ì´ ì¡´ì¬?˜ì? ?ŠëŠ”?? |
| `SCRAPING_SOURCE_NOT_FOUND` | 404 | ì§€?í•˜ì§€ ?ŠëŠ” `sourceName`?´ë‹¤. |
| `SCRAPING_ALREADY_RUNNING` | 409 | ?´ë? ?¤í–‰ ì¤‘ì¸ ?Œì´?„ë¼?¸ì´?? |
| `SCRAPING_EXECUTION_FAILED` | 500 | ?¤í–‰ ?ëŠ” ?¬ì‹œ???”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |
| `SCRAPING_TEST_FAILED` | 500 | ?ŒìŠ¤???¤í–‰ ?”ì²­ ì²˜ë¦¬???¤íŒ¨?ˆë‹¤. |

### FastAPI ErrorCode ??Spring ErrorCode ë§¤í•‘

| FastAPI ErrorCode | Spring ErrorCode | ?¤ëª… |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | `SCRAPING_PIPELINE_NOT_FOUND` | ?Œì´?„ë¼???†ìŒ |
| `SCRAPING_SOURCE_NOT_FOUND` | `SCRAPING_SOURCE_NOT_FOUND` | ë¯¸ì???sourceName |
| `SCRAPING_ALREADY_RUNNING` | `SCRAPING_ALREADY_RUNNING` | ?´ë? ?¤í–‰ ì¤?|
| `SCRAPING_EXECUTION_FAILED` | `SCRAPING_EXECUTION_FAILED` | ?¤í–‰ ?¤íŒ¨ |
| `SCRAPING_TEST_FAILED` | `SCRAPING_TEST_FAILED` | ?ŒìŠ¤???¤í–‰ ?¤íŒ¨ |
| `FASTAPI_INTERNAL_ERROR` | `SCRAPING_EXECUTION_FAILED` | FastAPI ?´ë? ì²˜ë¦¬ ?¤íŒ¨ |
| `DISCORD_ALERT_SEND_FAILED` | `SCRAPING_EXECUTION_FAILED` | ? íƒ ê¸°ëŠ¥???¤íŒ¨ ?Œë¦¼ ?„ì†¡ ?¤íŒ¨ |
