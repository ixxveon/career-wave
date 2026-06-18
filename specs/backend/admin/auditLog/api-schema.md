# API Schema: auditLog

> 백엔드와 프론트엔드 간 `auditLog` 도메인 API 계약 문서다.
> 이 문서는 기능 설명이 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 모든 `page` Query Parameter는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환에서만 `page - 1`을 적용한다.
- `from`, `to`는 ISO 8601 UTC 문자열을 사용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서의 ErrorCode 표에는 `auditLog` 도메인 코드만 작성한다.

### 권한 표기

- 문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`를 사용한다.
- Spring Security에서는 세부 역할 `MASTER`, `BACKEND`, `CS`를 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑한다.
- 감사 로그 조회 API의 실제 접근 조건은 관리자 인증(`ROLE_ADMIN`) + 세부 역할 `MASTER` 또는 `BACKEND`다.

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
  "message": "감사 로그를 찾을 수 없습니다.",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | ERD CHECK 제약 |
|---|---|---|
| `AuditLogType` | `ADMIN_ACTIVITY`, `ADMIN_MANAGEMENT`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` | `audit_logs.log_type` |
| `AuditLogSeverity` | `INFO`, `WARN`, `ERROR`, `SUCCESS` | `audit_logs.severity` |

---

## 3. Query Parameter -> ERD 컬럼 매핑

### GET /api/v1/admin/audit-logs/summary

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `from` | `string` | `audit_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `audit_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |

### GET /api/v1/admin/audit-logs

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `logType` | `ADMIN_ACTIVITY \| ADMIN_MANAGEMENT \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | `audit_logs.log_type` | 로그 유형 필터 |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | `audit_logs.severity` | 심각도 필터 |
| `keyword` | `string` | `audit_logs.action`, `audit_logs.target_type`, `audit_logs.target_id`, `audit_logs.detail` | 검색어, `trim()` 기준 빈 문자열은 미적용, 최대 100자 |
| `from` | `string` | `audit_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | `audit_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기, 최소 1, 최대 100 |

---

## 4. 감사 로그 API

### 4.1 GET /api/v1/admin/audit-logs/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs/summary`
- **Auth**: `ROLE_ADMIN` + (`MASTER` or `BACKEND`)

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `from` | `string` | N | `audit_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `audit_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AuditLogDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "감사 로그 요약 조회에 성공했습니다.",
  "data": {
    "totalCount": 1250,
    "adminActivityCount": 320,
    "adminManagementCount": 12,
    "aiMetricsSystemCount": 610,
    "scrapingSystemCount": 308,
    "infoCount": 820,
    "warnCount": 210,
    "errorCount": 180,
    "successCount": 40
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`을 반환한다.  
> 공통 요청 검증 실패: `from`, `to` 형식이 ISO 8601 UTC가 아니거나 `from > to`이면 `INVALID_DATE_RANGE`가 반환된다.

---

### 4.2 GET /api/v1/admin/audit-logs

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs`
- **Auth**: `ROLE_ADMIN` + (`MASTER` or `BACKEND`)

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `logType` | `ADMIN_ACTIVITY \| ADMIN_MANAGEMENT \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | N | `audit_logs.log_type` | 로그 유형 필터 |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | N | `audit_logs.severity` | 심각도 필터 |
| `keyword` | `string` | N | `audit_logs.action`, `audit_logs.target_type`, `audit_logs.target_id`, `audit_logs.detail` | 검색어, `trim()` 기준 빈 문자열은 미적용, 최대 100자 |
| `from` | `string` | N | `audit_logs.created_at` | 조회 시작 일시, ISO 8601 UTC |
| `to` | `string` | N | `audit_logs.created_at` | 조회 종료 일시, ISO 8601 UTC |
| `page` | `number` | N | 없음 | 페이지 번호, 1-based, 기본값 1 |
| `size` | `number` | N | 없음 | 페이지 크기, 기본값 20, 최소 1, 최대 100 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AuditLogDTO.ResponseList>`

```json
{
  "success": true,
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
| `INVALID_AUDIT_LOG_TYPE` | 400 | 유효하지 않은 감사 로그 유형입니다. |
| `INVALID_AUDIT_LOG_SEVERITY` | 400 | 유효하지 않은 감사 로그 심각도입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`을 반환한다.  
> 공통 요청 검증 실패: `from`, `to` 형식 오류, `from > to`는 `INVALID_DATE_RANGE`를 반환하고, `page < 1`, `size < 1`, `size > 100`, `keyword` 100자 초과는 공통 `400` 검증 오류를 반환한다.

---

### 4.3 GET /api/v1/admin/audit-logs/{logId}

- **Method**: `GET`
- **Path**: `/api/v1/admin/audit-logs/{logId}`
- **Auth**: `ROLE_ADMIN` + (`MASTER` or `BACKEND`)

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AuditLogDTO.ResponseDetail>`

```json
{
  "success": true,
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
| `INVALID_DATE_RANGE` | 400 | `from`은 `to`보다 이후 시점일 수 없습니다. |
| `AUDIT_LOG_NOT_FOUND` | 404 | 감사 로그를 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`을 반환한다.

---

## 5. DTO 계약

### 5.1 `AuditLogDTO.ResponseSummary`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `totalCount` | `number` | Y | 없음 | 전체 감사 로그 수 |
| `adminActivityCount` | `number` | Y | 없음 | `logType = ADMIN_ACTIVITY` 집계 수 |
| `adminManagementCount` | `number` | Y | 없음 | `logType = ADMIN_MANAGEMENT` 집계 수 |
| `aiMetricsSystemCount` | `number` | Y | 없음 | `logType = AI_METRICS_SYSTEM` 집계 수 |
| `scrapingSystemCount` | `number` | Y | 없음 | `logType = SCRAPING_SYSTEM` 집계 수 |
| `infoCount` | `number` | Y | 없음 | `severity = INFO` 집계 수 |
| `warnCount` | `number` | Y | 없음 | `severity = WARN` 집계 수 |
| `errorCount` | `number` | Y | 없음 | `severity = ERROR` 집계 수 |
| `successCount` | `number` | Y | 없음 | `severity = SUCCESS` 집계 수 |

### 5.2 `AuditLogDTO.ResponseItem`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `auditLogId` | `number` | Y | `audit_logs.audit_log_id` | 감사 로그 ID |
| `adminId` | `number \| null` | N | `audit_logs.admin_id` | 작업 관리자 ID |
| `logType` | `ADMIN_ACTIVITY \| ADMIN_MANAGEMENT \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | Y | `audit_logs.log_type` | 로그 유형 |
| `action` | `string` | Y | `audit_logs.action` | 작업 액션 |
| `targetType` | `string \| null` | N | `audit_logs.target_type` | 대상 유형 |
| `targetId` | `string \| null` | N | `audit_logs.target_id` | 대상 식별자 |
| `ipAddress` | `string \| null` | N | `audit_logs.ip_address` | 요청 IP 주소 |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | Y | `audit_logs.severity` | 심각도 |
| `detail` | `string \| null` | N | `audit_logs.detail` | 상세 내용 |
| `createdAt` | `string` | Y | `audit_logs.created_at` | 발생 시각 |

### 5.3 `AuditLogDTO.ResponseDetail`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `auditLogId` | `number` | Y | `audit_logs.audit_log_id` | 감사 로그 ID |
| `adminId` | `number \| null` | N | `audit_logs.admin_id` | 작업 관리자 ID |
| `logType` | `ADMIN_ACTIVITY \| ADMIN_MANAGEMENT \| AI_METRICS_SYSTEM \| SCRAPING_SYSTEM` | Y | `audit_logs.log_type` | 로그 유형 |
| `action` | `string` | Y | `audit_logs.action` | 작업 액션 |
| `targetType` | `string \| null` | N | `audit_logs.target_type` | 대상 유형 |
| `targetId` | `string \| null` | N | `audit_logs.target_id` | 대상 식별자 |
| `ipAddress` | `string \| null` | N | `audit_logs.ip_address` | 요청 IP 주소 |
| `severity` | `INFO \| WARN \| ERROR \| SUCCESS` | Y | `audit_logs.severity` | 심각도 |
| `detail` | `string \| null` | N | `audit_logs.detail` | 상세 내용 |
| `createdAt` | `string` | Y | `audit_logs.created_at` | 발생 시각 |

### 5.4 `AuditLogDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `AuditLogDTO.ResponseItem[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

---

## 6. ErrorCode 계약

### 6.1 auditLog Domain ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `AUDIT_LOG_NOT_FOUND` | 404 | 요청한 감사 로그가 존재하지 않는다. |
| `INVALID_AUDIT_LOG_TYPE` | 400 | 허용되지 않은 감사 로그 유형 값이 입력되었다. |
| `INVALID_AUDIT_LOG_SEVERITY` | 400 | 허용되지 않은 감사 로그 심각도 값이 입력되었다. |

### 6.2 ErrorCode 사용 위치

| ErrorCode | Used By | Trigger |
|---|---|---|
| `AUDIT_LOG_NOT_FOUND` | `GET /api/v1/admin/audit-logs/{logId}` | 요청한 `logId`에 해당하는 감사 로그가 존재하지 않을 때 |
| `INVALID_AUDIT_LOG_TYPE` | `GET /api/v1/admin/audit-logs` | `logType`이 `ADMIN_ACTIVITY`, `ADMIN_MANAGEMENT`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` 범위를 벗어날 때 |
| `INVALID_AUDIT_LOG_SEVERITY` | `GET /api/v1/admin/audit-logs` | `severity`가 `INFO`, `WARN`, `ERROR`, `SUCCESS` 범위를 벗어날 때 |

### 6.3 Common Validation / Security Response

- `from`, `to` 형식 오류, `page < 1`, `size < 1`, `size > 100`, `keyword` 100자 초과는 공통 `400` 검증 오류로 처리하고, `from > to`는 `INVALID_DATE_RANGE`로 처리한다.
- 인증이 없으면 `401`, 권한이 없으면 `403`을 반환한다.
