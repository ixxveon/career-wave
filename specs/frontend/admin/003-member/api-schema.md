# API Schema: 회원관리 (Member Management)

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
| `MemberStatus` | `ACTIVE` \| `SUSPENDED` \| `BANNED` |
| `MemberRole` | `ROLE_USER` \| `ROLE_COMPANY` |
| `PlanType` | `FREE` \| `PREMIUM` |
| `SanctionType` | `WARNING` \| `SUSPEND` \| `BLACKLIST` |
| `SuspendDuration` | `THREE_DAYS` \| `SEVEN_DAYS` \| `THIRTY_DAYS` \| `PERMANENT` |
| `HrStatus` | `PENDING` \| `ACTIVE` \| `REMOVED` |
| `PermissionLevel` | `FULL` \| `NOTICE` \| `VIEWER` |

---

## 1. 개인 회원 목록 조회

```http
GET /api/admin/members
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `role` | string | N | `ROLE_USER` \| `ROLE_COMPANY` — 생략 시 전체 |
| `status` | string | N | `ACTIVE` \| `SUSPENDED` \| `BANNED` — 생략 시 전체 |
| `plan` | string | N | `FREE` \| `PREMIUM` — 생략 시 전체 |
| `keyword` | string | N | 이름·이메일·로그인 ID 통합 검색어 (최대 100자) |
| `startDate` | string | N | 가입일 범위 시작 (`yyyy-MM-dd`) |
| `endDate` | string | N | 가입일 범위 종료 (`yyyy-MM-dd`) |
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
        "memberId": "uuid",
        "loginId": "minji_user",
        "name": "김민지",
        "email": "minji@email.com",
        "role": "ROLE_USER",
        "plan": "PREMIUM",
        "memberStatus": "ACTIVE",
        "warningCount": 0,
        "reportCount": 0,
        "joinedAt": "2026-05-02T00:00:00Z",
        "lastLoginAt": "2026-05-21T10:30:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 12482,
    "totalPages": 625
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
| `INVALID_MEMBER_FILTER` | 400 | 지원하지 않는 필터 값입니다. |

---

## 2. 개인 회원 상세 조회

```http
GET /api/admin/members/{memberId}
```

### Path Parameters

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `memberId` | string (UUID) | 조회할 회원 ID |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "memberId": "uuid",
    "loginId": "minji_user",
    "name": "김민지",
    "email": "minji@email.com",
    "role": "ROLE_USER",
    "plan": "PREMIUM",
    "memberStatus": "ACTIVE",
    "warningCount": 2,
    "reportCount": 5,
    "joinedAt": "2026-05-02T00:00:00Z",
    "lastLoginAt": "2026-05-21T10:30:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원입니다. |

---

## 3. 회원 제재 처리

```http
POST /api/admin/members/{memberId}/sanctions
```

### Request Body

```json
{
  "sanctionType": "SUSPEND",
  "duration": "SEVEN_DAYS",
  "reason": "이용 약관 위반 — 욕설·비방 게시물 반복 게시"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sanctionType` | string | Y | `WARNING` \| `SUSPEND` \| `BLACKLIST` |
| `duration` | string | 조건부 | `SUSPEND`일 때 필수. `THREE_DAYS` \| `SEVEN_DAYS` \| `THIRTY_DAYS` \| `PERMANENT` |
| `reason` | string | Y | 제재 사유 (최소 10자, 최대 500자) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "제재 처리가 완료되었습니다.",
  "data": {
    "memberId": "uuid",
    "memberStatus": "SUSPENDED",
    "sanctionType": "SUSPEND",
    "duration": "SEVEN_DAYS",
    "startDate": "2026-05-30T12:00:00Z",
    "endDate": "2026-06-06T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원입니다. |
| `ALREADY_BANNED` | 409 | 이미 영구 정지된 회원입니다. |
| `INVALID_SANCTION_DURATION` | 400 | SUSPEND 제재 시 기간이 필요합니다. |
| `REASON_REQUIRED` | 400 | 제재 사유는 필수입니다. |
| `REASON_TOO_SHORT` | 400 | 제재 사유는 최소 10자 이상 입력해주세요. |

---

## 4. 기업 회원 목록 조회

```http
GET /api/admin/hr-managers
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `hrStatus` | string | N | `PENDING` \| `ACTIVE` \| `REMOVED` — 생략 시 전체 |
| `keyword` | string | N | HR 담당자명·기업명·이메일 통합 검색어 (최대 100자) |
| `startDate` | string | N | 가입일 범위 시작 (`yyyy-MM-dd`) |
| `endDate` | string | N | 가입일 범위 종료 (`yyyy-MM-dd`) |
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
        "memberId": "uuid",
        "hrName": "이상훈",
        "email": "hr.lee@techstart.com",
        "companyName": "(주)테크스타트",
        "certificateNumber": "123-45-67890",
        "permissionLevel": "FULL",
        "certFileUrl": "https://storage.example.com/cert/cert_001.pdf",
        "certFileName": "재직증명서_이상훈_20260501.pdf",
        "joinedAt": "2026-05-01T00:00:00Z",
        "approvedAt": "2026-05-03T09:00:00Z",
        "hrStatus": "ACTIVE"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 4,
    "totalPages": 1,
    "pendingCount": 2
  }
}
```

> `pendingCount`: 탭 뱃지 표시용 승인 대기 건수

---

## 5. 기업 회원 상세 조회

```http
GET /api/admin/hr-managers/{memberId}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "memberId": "uuid",
    "hrName": "이상훈",
    "email": "hr.lee@techstart.com",
    "companyName": "(주)테크스타트",
    "certificateNumber": "123-45-67890",
    "permissionLevel": "FULL",
    "certFileUrl": "https://storage.example.com/cert/cert_001.pdf",
    "certFileName": "재직증명서_이상훈_20260501.pdf",
    "joinedAt": "2026-05-01T00:00:00Z",
    "approvedAt": "2026-05-03T09:00:00Z",
    "hrStatus": "ACTIVE",
    "rejectReason": null
  }
}
```

---

## 6. 기업 회원 승인

```http
PATCH /api/admin/hr-managers/{memberId}/approve
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "기업 회원 가입이 승인되었습니다.",
  "data": {
    "memberId": "uuid",
    "hrStatus": "ACTIVE",
    "approvedAt": "2026-05-30T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 가입 신청입니다. |

---

## 7. 기업 회원 반려

```http
PATCH /api/admin/hr-managers/{memberId}/reject
```

### Request Body

```json
{
  "rejectReason": "제출하신 재직증명서의 유효기간이 만료되었습니다."
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `rejectReason` | string | Y | 반려 사유 (최소 10자, 최대 500자) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "기업 회원 가입이 반려되었습니다.",
  "data": {
    "memberId": "uuid",
    "hrStatus": "REMOVED",
    "rejectReason": "제출하신 재직증명서의 유효기간이 만료되었습니다."
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 가입 신청입니다. |
| `REASON_REQUIRED` | 400 | 반려 사유는 필수입니다. |
| `REASON_TOO_SHORT` | 400 | 반려 사유는 최소 10자 이상 입력해주세요. |
