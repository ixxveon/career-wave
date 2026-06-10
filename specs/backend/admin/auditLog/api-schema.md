# API Schema: auditLog

> 백엔드와 프론트엔드 간 `auditLog` 도메인 API 계약 문서.
> 본 문서는 기능 설명이 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 페이지 Query Parameter `page`는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- `from`, `to`는 ISO 8601 UTC 문자열 규격을 사용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.

### 권한 표기

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`를 사용한다.  
Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑한다.

### 공통 응답 래퍼

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 공통 페이지 응답

```json
{
  "success": true,
  "statusCode": 200,
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

---

## 2. Enum 계약

| Name | Values |
|---|---|
| `logType` | `ADMIN_ACTIVITY`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` |
| `severity` | `INFO`, `WARN`, `ERROR`, `SUCCESS` |

---

## 3. 감사 로그 API

### 3.1 GET /api/v1/admin/audit-logs/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs/summary`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `from` | `string` | N | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | 조회 종료 일시, ISO 8601 UTC |

#### Request Body

없음

#### Response Body

`ApiResponse<AuditLogDTO.ResponseSummary>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "감사 로그 요약 조회에 성공했습니다.",
  "data": {
    "totalCount": 1250,
    "adminActivityCount": 320,
    "aiMetricsSystemCount": 610,
    "scrapingSystemCount": 320,
    "infoCount": 820,
    "warnCount": 210,
    "errorCount": 180,
    "successCount": 40
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `INVALID_AUDIT_LOG_DATE_RANGE` | 400 | 감사 로그 조회 기간이 유효하지 않습니다. |
| `FORBIDDEN` | 403 | 감사 로그 요약 조회 권한이 없습니다. |

---

### 3.2 GET /api/v1/admin/audit-logs

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `logType` | `ADMIN_ACTIVITY \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | N | `audit_logs.log_type` 필터 |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | N | `audit_logs.severity` 필터 |
| `keyword` | `string` | N | `action`, `targetType`, `targetId`, `detail` 기준 검색어. 빈 문자열은 미입력으로 간주하며, 길이 제한 초과 시 검증 오류 처리 |
| `from` | `string` | N | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | 조회 종료 일시, ISO 8601 UTC |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response Body

`ApiResponse<AuditLogDTO.ResponsePage>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "감사 로그 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "auditLogId": 101,
        "adminId": 1,
        "logType": "ADMIN_ACTIVITY",
        "action": "UPDATE_ADMIN_ROLE",
        "targetType": "ADMIN",
        "targetId": "2",
        "ipAddress": "10.0.0.1",
        "severity": "INFO",
        "detail": "adminRole changed from BACKEND to CS",
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

| ErrorCode | HTTP | Message |
|---|---|---|
| `INVALID_AUDIT_LOG_FILTER` | 400 | 감사 로그 검색 조건이 유효하지 않습니다. (`keyword` 길이 제한 초과 포함) |
| `INVALID_AUDIT_LOG_DATE_RANGE` | 400 | 감사 로그 조회 기간이 유효하지 않습니다. |
| `INVALID_PAGE_REQUEST` | 400 | 유효하지 않은 페이지 요청입니다. |
| `FORBIDDEN` | 403 | 감사 로그 목록 조회 권한이 없습니다. |

---

### 3.3 GET /api/v1/admin/audit-logs/{logId}

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs/{logId}`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<AuditLogDTO.ResponseDetail>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "감사 로그 상세 조회에 성공했습니다.",
  "data": {
    "auditLogId": 101,
    "adminId": 1,
    "logType": "ADMIN_ACTIVITY",
    "action": "UPDATE_ADMIN_ROLE",
    "targetType": "ADMIN",
    "targetId": "2",
    "ipAddress": "10.0.0.1",
    "severity": "INFO",
    "detail": "adminRole changed from BACKEND to CS",
    "createdAt": "2026-06-10T02:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `AUDIT_LOG_NOT_FOUND` | 404 | 감사 로그를 찾을 수 없습니다. |
| `FORBIDDEN` | 403 | 감사 로그 상세 조회 권한이 없습니다. |

---

## 4. DTO 계약 표

### 4.1 AuditLogDTO

#### `AuditLogDTO.ResponseSummary`

| Field | Type | Required | Description |
|---|---|---|---|
| `totalCount` | `number` | Y | 전체 감사 로그 수 |
| `adminActivityCount` | `number` | Y | `logType = ADMIN_ACTIVITY` 건수 |
| `aiMetricsSystemCount` | `number` | Y | `logType = AI_METRICS_SYSTEM` 건수 |
| `scrapingSystemCount` | `number` | Y | `logType = SCRAPING_SYSTEM` 건수 |
| `infoCount` | `number` | Y | `severity = INFO` 건수 |
| `warnCount` | `number` | Y | `severity = WARN` 건수 |
| `errorCount` | `number` | Y | `severity = ERROR` 건수 |
| `successCount` | `number` | Y | `severity = SUCCESS` 건수 |

#### `AuditLogDTO.ResponseItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `auditLogId` | `number` | Y | 감사 로그 ID |
| `adminId` | `number \| null` | N | 수행 관리자 ID |
| `logType` | `ADMIN_ACTIVITY \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | Y | 로그 유형 |
| `action` | `string` | Y | 수행 액션 |
| `targetType` | `string \| null` | N | 대상 유형 |
| `targetId` | `string \| null` | N | 대상 식별자 |
| `ipAddress` | `string \| null` | N | 요청 IP |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | Y | 심각도 |
| `detail` | `string \| null` | N | 상세 내용 |
| `createdAt` | `string` | Y | 발생 시각 |

#### `AuditLogDTO.ResponseDetail`

| Field | Type | Required | Description |
|---|---|---|---|
| `auditLogId` | `number` | Y | 감사 로그 ID |
| `adminId` | `number \| null` | N | 수행 관리자 ID |
| `logType` | `ADMIN_ACTIVITY \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | Y | 로그 유형 |
| `action` | `string` | Y | 수행 액션 |
| `targetType` | `string \| null` | N | 대상 유형 |
| `targetId` | `string \| null` | N | 대상 식별자 |
| `ipAddress` | `string \| null` | N | 요청 IP |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | Y | 심각도 |
| `detail` | `string \| null` | N | 상세 내용 |
| `createdAt` | `string` | Y | 발생 시각 |

#### `AuditLogDTO.ResponsePage`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `AuditLogDTO.ResponseItem[]` | Y | 목록 데이터 |
| `page` | `number` | Y | 현재 페이지, 1-based |
| `size` | `number` | Y | 페이지 크기 |
| `totalElements` | `number` | Y | 전체 건수 |
| `totalPages` | `number` | Y | 전체 페이지 수 |

---

## 5. ErrorCode 계약 표

### 5.1 Global Common ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증이 필요한 요청에 로그인 정보가 없음 |
| `FORBIDDEN` | 403 | 해당 리소스에 대한 관리자 권한이 없음 |
| `INVALID_PAGE_REQUEST` | 400 | `page` 또는 `size` 값이 유효하지 않음 |

### 5.2 auditLog Domain ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `INVALID_AUDIT_LOG_FILTER` | 400 | 감사 로그 검색 조건이 유효하지 않음 (`keyword` 길이 제한 초과 포함) |
| `INVALID_AUDIT_LOG_DATE_RANGE` | 400 | `from`, `to` 기간이 유효하지 않음 |
| `AUDIT_LOG_NOT_FOUND` | 404 | 요청한 감사 로그가 존재하지 않음 |
