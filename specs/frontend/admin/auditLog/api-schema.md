# API Schema: 관리자 감사 로그

## 공통 규칙

- Base Path: `/api/v1/admin/audit-logs`
- Auth: Bearer Token
- Role: See `Permissions`.
- Response: `ApiResponse<T>`

## Permissions

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`, `USER`를 사용한다. Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`, `ROLE_USER`로 매핑한다.

| Method | Path | Allowed Roles |
|---|---|---|
| GET | `/api/v1/admin/audit-logs/summary` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/audit-logs` | `MASTER`, `BACKEND` |
| GET | `/api/v1/admin/audit-logs/{logId}` | `MASTER`, `BACKEND` |

- 날짜 형식: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`)
- 감사 로그는 관리자 운영 행위, AI 운영 이벤트, 스크래핑 운영 이벤트를 통합 조회하기 위한 읽기 중심 API로 정의한다.

## 공통 타입

```ts
type AuditLogSource = 'ADMIN' | 'AI' | 'SCRAPING';
type AuditLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
```

- `AuditLogSource`는 화면의 통합 탭 기준 source 값이다.
- `AuditLogLevel`은 기존 관리자 seed와 운영 로그 화면에서 사용하는 등급을 통합한다.
- 상세 로그에는 토큰, 쿠키, 비밀번호, 프롬프트 원문, 개인정보, 외부 응답 전문을 포함하지 않는다.

## GET /summary

감사 로그 요약 카운트를 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | string | false | 조회 시작 일시. ISO 8601 UTC 기준이며 해당 시각 이상(`>=`)을 포함한다. 단독 제공 시 `from` 이후 전체 기간을 조회한다. |
| `to` | string | false | 조회 종료 일시. ISO 8601 UTC 기준이며 해당 시각 이하(`<=`)를 포함한다. 단독 제공 시 `to` 이전 전체 기간을 조회한다. |

### Response Data

```json
{
  "totalCount": 18,
  "adminCount": 5,
  "aiCount": 6,
  "scrapingCount": 7,
  "warningCount": 4,
  "errorCount": 2,
  "lastSyncedAt": "2026-06-03T09:30:00+09:00"
}
```

## GET /

감사 로그 목록을 조회한다.

### Query

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | AuditLogSource | false | `ADMIN`, `AI`, `SCRAPING` |
| `level` | AuditLogLevel | false | `INFO`, `WARN`, `ERROR`, `SUCCESS` |
| `keyword` | string | false | source label, 요약, 상세 요약 검색어 |
| `from` | string | false | 조회 시작 일시. ISO 8601 UTC 기준이며 해당 시각 이상(`>=`)을 포함한다. 단독 제공 시 `from` 이후 전체 기간을 조회한다. |
| `to` | string | false | 조회 종료 일시. ISO 8601 UTC 기준이며 해당 시각 이하(`<=`)를 포함한다. 단독 제공 시 `to` 이전 전체 기간을 조회한다. |
| `page` | number | false | 1부터 시작 |
| `size` | number | false | 기본 20 |

### Response Data

```json
{
  "content": [
    {
      "id": "AUDIT-20260603-0001",
      "source": "ADMIN",
      "sourceLabel": "관리자 관리",
      "level": "WARN",
      "summary": "권한 변경 승인",
      "detailSummary": "actor: super_admin / target: member:U-1007 / role:CS",
      "actorId": "super_admin",
      "targetType": "MEMBER",
      "targetId": "U-1007",
      "ipAddressMasked": "10.20.0.xxx",
      "occurredAt": "2026-06-03T09:12:00+09:00"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 18,
  "totalPages": 1
}
```

## GET /{logId}

감사 로그 상세를 조회한다.

### Path

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `logId` | string | true | 감사 로그 식별자 |

### Response Data

```json
{
  "id": "AUDIT-20260603-0001",
  "source": "ADMIN",
  "sourceLabel": "관리자 관리",
  "level": "WARN",
  "summary": "권한 변경 승인",
  "detailSummary": "actor: super_admin / target: member:U-1007 / role:CS",
  "actorId": "super_admin",
  "targetType": "MEMBER",
  "targetId": "U-1007",
  "ipAddressMasked": "10.20.0.xxx",
  "requestId": "REQ-20260603-091200",
  "occurredAt": "2026-06-03T09:12:00+09:00"
}
```

## Error Cases

| Status | Message |
|--------|---------|
| 400 | 감사 로그 조회 조건이 올바르지 않습니다. |
| 401 | 인증이 필요합니다. |
| 403 | 감사 로그 조회 권한이 없습니다. |
| 404 | 감사 로그를 찾을 수 없습니다. |
| 500 | 감사 로그 조회 중 오류가 발생했습니다. |
