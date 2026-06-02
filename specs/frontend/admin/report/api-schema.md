# API Schema: 신고관리 (Report Management)

> 프론트엔드 ↔ 어드민 백엔드 간 데이터 계약.
> 현재는 더미 데이터 기반이며, API 연동 시 이 계약을 기준으로 개발한다.
> 모든 응답은 `ApiResponse<T>` 형식을 사용한다.

---

## 공통 응답 형식

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `success` | boolean | 성공 여부 |
| `statusCode` | number | HTTP 상태 코드 |
| `message` | string | 처리 결과 메시지 (실패 시 사용자 안내 문구로 활용) |
| `data` | T \| null | 응답 데이터 (실패 시 null) |

---

## Enums

| 타입 | 값 |
|---|---|
| `ReportStatus` | `PENDING` \| `BLINDED` \| `DISMISSED` |
| `TargetType` | `BOARD` \| `COMMENT` \| `MEMBER` |
| `ReportReason` | `SPAM` \| `ABUSE` \| `AD` \| `INAPPROPRIATE` \| `OTHER` |

### 한글 매핑

| Enum | 표시 |
|---|---|
| `PENDING` | 처리 대기 |
| `BLINDED` | 블라인드 |
| `DISMISSED` | 기각 |
| `BOARD` | 게시글 |
| `COMMENT` | 댓글 |
| `MEMBER` | 회원 |
| `SPAM` | 스팸/광고 |
| `ABUSE` | 욕설/비방 |
| `AD` | 광고성 |
| `INAPPROPRIATE` | 부적절한 내용 |
| `OTHER` | 기타 |

---

## 1. KPI 집계 조회

```http
GET /api/admin/reports/summary
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "totalCount": 142,
    "pendingCount": 38,
    "blindedCount": 79,
    "highRiskCount": 12
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `totalCount` | number | 전체 신고 건수 |
| `pendingCount` | number | 처리 대기(미처리) 건수 |
| `blindedCount` | number | 블라인드 처리 건수 |
| `highRiskCount` | number | AI 고위험 감지 건수 (ai_suggestion 심각도 `높음`) |

> `highRiskCount`는 현재 클라이언트에서 더미 데이터 기준으로 집계하며, API 연동 시 서버에서 제공한다.

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 2. 신고 목록 조회

```http
GET /api/admin/reports
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `status` | string | N | `PENDING` \| `BLINDED` \| `DISMISSED` — 생략 시 전체 |
| `targetType` | string | N | `BOARD` \| `COMMENT` \| `MEMBER` — 생략 시 전체 |
| `reason` | string | N | `SPAM` \| `ABUSE` \| `AD` \| `INAPPROPRIATE` \| `OTHER` — 생략 시 전체 _(v2 예정)_ |
| `keyword` | string | N | 신고자명·피신고자명·콘텐츠 제목 통합 검색 |
| `page` | number | N | 페이지 번호 (기본값: 1) |
| `size` | number | N | 페이지당 건수 (기본값: 20, 최대 100) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [
      {
        "reportId": 1,
        "targetType": "BOARD",
        "reason": "SPAM",
        "reportStatus": "PENDING",
        "reporterName": "김민지",
        "reportedName": "이상훈",
        "contentTitle": "게시글 제목",
        "createdAt": "2026-05-30T10:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
| `INVALID_REPORT_FILTER` | 400 | 지원하지 않는 필터 값입니다. |

---

## 3. 신고 상세 조회

```http
GET /api/admin/reports/{reportId}
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `reportId` | number | 조회할 신고 ID |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "reportId": 1,
    "targetType": "BOARD",
    "targetId": 102,
    "reason": "SPAM",
    "reportStatus": "PENDING",
    "reporterName": "김민지",
    "reportedName": "이상훈",
    "contentTitle": "게시글 제목",
    "contentBody": "게시글 본문 내용...",
    "createdAt": "2026-05-30T10:00:00Z",
    "processedAt": null,
    "processedBy": null
  }
}
```

> - `contentTitle`: `target_type = BOARD`일 때 게시글 제목, 그 외 null
> - `contentBody`: 대상 콘텐츠 본문 (게시글 본문 또는 댓글 내용)
> - `contentTitle`, `contentBody`: 대상이 삭제된 경우 null (API 연동 시 "삭제된 콘텐츠" 안내 처리)
> - `processedAt`, `processedBy`: `PENDING` 상태이면 null

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `REPORT_NOT_FOUND` | 404 | 존재하지 않는 신고입니다. |

---

## 4. 블라인드 처리

```http
PATCH /api/admin/reports/{reportId}/blind
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `reportId` | number | 처리할 신고 ID |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "블라인드 처리가 완료되었습니다.",
  "data": {
    "reportId": 1,
    "reportStatus": "BLINDED",
    "processedAt": "2026-05-30T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
| `REPORT_NOT_FOUND` | 404 | 존재하지 않는 신고입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 신고입니다. |

---

## 5. 기각 처리

```http
PATCH /api/admin/reports/{reportId}/dismiss
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `reportId` | number | 처리할 신고 ID |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "신고가 기각 처리되었습니다.",
  "data": {
    "reportId": 1,
    "reportStatus": "DISMISSED",
    "processedAt": "2026-05-30T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
| `REPORT_NOT_FOUND` | 404 | 존재하지 않는 신고입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 신고입니다. |
