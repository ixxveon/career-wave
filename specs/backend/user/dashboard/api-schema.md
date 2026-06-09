# API Schema: 사용자 대시보드

> 사용자 대시보드 백엔드 API 계약안입니다.
> 관련 문서: `spec.md` / `plan.md` / `tasks.md` / `constitution.md` / `checklist.md`
> 사용자 API 경로는 최신 CareerWave Convention 기준인 `/api/v1/user/{domain}` 형식을 따른다.

---

## 공통

### Base URL

```txt
/api/v1/user/dashboard
```

### 날짜 포맷

모든 날짜와 시간은 ISO 8601 형식을 사용한다.

예시:

```txt
2026-05-31T12:30:00Z
```

### 필드명 표기

DB 컬럼명은 snake_case(`member_id`)를 따르며, API DTO 필드는 camelCase(`memberId`)를 사용한다.

### 인증

모든 API는 로그인된 사용자 기준으로 동작한다.

```txt
Authorization: Bearer {accessToken}
```

### 권한

```txt
ROLE_USER
```

### 응답 공통 포맷

모든 API 응답은 `ApiResponse<T>` 형식을 사용한다.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

### 실패 응답 공통 포맷

```json
{
  "success": false,
  "statusCode": 404,
  "message": "대상을 찾을 수 없습니다.",
  "data": null
}
```

### 공통 Enum

| Enum                 | Values                                    |
| -------------------- | ----------------------------------------- |
| `RoleType`           | `ROLE_USER`, `ROLE_COMPANY`, `ROLE_ADMIN` |
| `MemberStatus`       | `ACTIVE`, `SUSPENDED`, `BANNED`           |
| `SubscriptionStatus` | `FREE`, `PREMIUM`                         |
| `NoticeStatus`       | `ACTIVE`, `CLOSED`                        |
| `CareerLevel`        | `JUNIOR`, `SENIOR`, `ANY`                 |
| `ScrapSort`          | `LATEST`                                  |

### 공통 Error Cases

| statusCode | ErrorCode                     | 상황                 |
| ---------: | ----------------------------- | ------------------ |
|      `400` | `INVALID_DASHBOARD_REQUEST`   | 잘못된 요청 또는 검색 조건 오류 |
|      `401` | `UNAUTHORIZED`                | 인증 필요 또는 토큰 만료     |
|      `403` | `DASHBOARD_FORBIDDEN_ACCESS`  | 본인 소유가 아닌 데이터 접근   |
|      `404` | `DASHBOARD_PROFILE_NOT_FOUND` | 회원 또는 프로필 정보 없음    |
|      `404` | `DASHBOARD_SCRAP_NOT_FOUND`   | 존재하지 않는 스크랩        |
|      `500` | `INTERNAL_SERVER_ERROR`       | 서버 오류              |

---

## 1. 내 정보 조회

* **Endpoint**: `GET /api/v1/user/dashboard/profile`
* **Auth**: Required
* **Role**: `ROLE_USER`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "회원 정보를 조회했습니다.",
  "data": {
    "memberId": "uuid-v4",
    "loginId": "career_user01",
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "01012345678",
    "roleType": "ROLE_USER",
    "memberStatus": "ACTIVE",
    "subscriptionStatus": "FREE",
    "notificationEnabled": true,
    "createdAt": "2026-05-01T12:00:00Z"
  }
}
```

### Error Cases

| statusCode | ErrorCode                     | 상황              |
| ---------: | ----------------------------- | --------------- |
|      `401` | `UNAUTHORIZED`                | 인증 필요 또는 토큰 만료  |
|      `404` | `DASHBOARD_PROFILE_NOT_FOUND` | 회원 또는 프로필 정보 없음 |

---

## 2. GitHub 연동 정보 조회

* **Endpoint**: `GET /api/v1/user/dashboard/github`
* **Auth**: Required
* **Role**: `ROLE_USER`

### Linked Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "GitHub 정보를 조회했습니다.",
  "data": {
    "githubId": "careerwave-user",
    "githubUrl": "https://github.com/careerwave-user",
    "linked": true
  }
}
```

### Not Linked Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "GitHub 정보가 없습니다.",
  "data": {
    "githubId": null,
    "githubUrl": null,
    "linked": false
  }
}
```

### Notes

* 프론트는 `linked` 값을 기준으로 GitHub 연동 상태를 표시한다.
* v1에서는 `personal_profiles.github_url` 존재 여부를 기준으로 `linked` 값을 판단한다.
* GitHub OAuth 기반 실제 연동 및 GitHub ID 동기화는 v1 범위에 포함하지 않는다.
* `githubId`는 v1에서 제공 가능한 값이 없을 경우 `null`을 반환할 수 있다.

### Error Cases

| statusCode | ErrorCode                     | 상황              |
| ---------: | ----------------------------- | --------------- |
|      `401` | `UNAUTHORIZED`                | 인증 필요 또는 토큰 만료  |
|      `404` | `DASHBOARD_PROFILE_NOT_FOUND` | 회원 또는 프로필 정보 없음 |

---

## 3. 회원 정보 수정

* **Endpoint**: `PATCH /api/v1/user/dashboard/profile`
* **Content-Type**: `application/json`
* **Auth**: Required
* **Role**: `ROLE_USER`

### Request

```json
{
  "name": "홍길동",
  "phone": "01011112222",
  "githubUrl": "https://github.com/careerwave-user"
}
```

### Request Fields

| Field       | Type             |  필수 | 설명             |
| ----------- | ---------------- | :-: | -------------- |
| `name`      | `string`         |  Y  | 회원 이름          |
| `phone`     | `string`         |  N  | 휴대폰 번호         |
| `githubUrl` | `string \| null` |  N  | GitHub 프로필 URL |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "회원 정보가 수정되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "name": "홍길동",
    "phone": "01011112222",
    "githubUrl": "https://github.com/careerwave-user"
  }
}
```

### Error Cases

| statusCode | ErrorCode                     | 상황                           |
| ---------: | ----------------------------- | ---------------------------- |
|      `400` | `INVALID_DASHBOARD_REQUEST`   | 이름, 휴대폰 번호, GitHub URL 형식 오류 |
|      `401` | `UNAUTHORIZED`                | 인증 필요 또는 토큰 만료               |
|      `404` | `DASHBOARD_PROFILE_NOT_FOUND` | 회원 또는 프로필 정보 없음              |

---

## 4. 스크랩 공고 목록 조회

* **Endpoint**: `GET /api/v1/user/dashboard/bookmarks`
* **Auth**: Required
* **Role**: `ROLE_USER`

### Query Parameters

| Parameter | Type        |  필수 | 기본값      | 설명               |
| --------- | ----------- | :-: | -------- | ---------------- |
| `keyword` | `string`    |  N  | `""`     | 기업명 또는 공고 제목 검색어 |
| `sort`    | `ScrapSort` |  N  | `LATEST` | 정렬 기준            |
| `page`    | `number`    |  N  | `0`      | 0-based page     |
| `size`    | `number`    |  N  | `10`     | 페이지 크기           |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "스크랩 공고를 조회했습니다.",
  "data": {
    "content": [
      {
        "bookmarkId": 1,
        "jobNoticeId": 101,
        "companyName": "커리어웨이브",
        "title": "프론트엔드 개발자 채용",
        "careerLevel": "JUNIOR",
        "location": "서울",
        "deadline": "2026-06-30",
        "noticeStatus": "ACTIVE",
        "deleted": false,
        "createdAt": "2026-05-20T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### Deleted Job Notice Response Example

기업에 의해 삭제된 채용공고가 사용자의 스크랩 목록에 남아 있는 경우, 목록에서는 삭제 상태를 표시할 수 있도록 `deleted` 값을 `true`로 반환한다.

```json
{
  "bookmarkId": 2,
  "jobNoticeId": 102,
  "companyName": "삭제된 공고",
  "title": "삭제된 채용공고입니다.",
  "careerLevel": null,
  "location": null,
  "deadline": null,
  "noticeStatus": "CLOSED",
  "deleted": true,
  "createdAt": "2026-05-21T10:00:00Z"
}
```

### Empty Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "스크랩 공고가 없습니다.",
  "data": {
    "content": [],
    "page": 0,
    "size": 10,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

### Error Cases

| statusCode | ErrorCode                    | 상황                  |
| ---------: | ---------------------------- | ------------------- |
|      `400` | `INVALID_DASHBOARD_REQUEST`  | 잘못된 검색 조건 또는 페이지 요청 |
|      `401` | `UNAUTHORIZED`               | 인증 필요 또는 토큰 만료      |
|      `403` | `DASHBOARD_FORBIDDEN_ACCESS` | 본인 소유가 아닌 데이터 접근    |

---

## 5. 스크랩 취소

* **Endpoint**: `DELETE /api/v1/user/dashboard/bookmarks/{bookmarkId}`
* **Auth**: Required
* **Role**: `ROLE_USER`

### Path Variables

| Name         | Type     | 설명      |
| ------------ | -------- | ------- |
| `bookmarkId` | `number` | 스크랩 식별자 |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "스크랩이 취소되었습니다.",
  "data": {
    "bookmarkId": 1
  }
}
```

### Error Cases

| statusCode | ErrorCode                    | 상황               |
| ---------: | ---------------------------- | ---------------- |
|      `401` | `UNAUTHORIZED`               | 인증 필요 또는 토큰 만료   |
|      `403` | `DASHBOARD_FORBIDDEN_ACCESS` | 본인 소유가 아닌 스크랩 접근 |
|      `404` | `DASHBOARD_SCRAP_NOT_FOUND`  | 존재하지 않는 스크랩      |
|      `500` | `INTERNAL_SERVER_ERROR`      | 서버 오류            |

---

## 6. 채용공고 상세 보기

스크랩 공고에서 채용공고 상세보기는 Dashboard API가 직접 제공하지 않는다.

### 동작

```txt
상세보기 클릭
→ 선택한 jobNoticeId 기준으로 JobNoticeDetail 모달 오픈
→ 상세 데이터 조회는 JobNotice 도메인 정책을 따른다
```

### Notes

* Dashboard 도메인은 스크랩 목록 조회 및 스크랩 해제까지만 담당한다.
* 채용공고 상세 조회 API는 JobNotice 도메인에서 제공한다.
* 삭제된 채용공고의 상세 진입 정책은 JobNotice 도메인 정책을 따른다.
