# API Schema: Dashboard

> 백엔드 통신을 위한 프론트엔드 계약안입니다.
> 관련 문서: `constitution.md` / `plan.md` / `tasks.md` / `spec.md`
> ERD 초안은 참고만 하며, 실제 연동 전 백엔드와 확정이 필요합니다.

---

## 공통

### Base URL

```txt
/api/v1/dashboard
```

### 날짜 포맷

모든 날짜와 시간은 ISO 8601 형식을 사용한다. 예: `2026-05-31T12:30:00Z`

### 필드명 표기

DB 컬럼명은 snake_case(`member_id`)를 따르며, Frontend API DTO는 기존 user frontend 문서 관례에 따라 camelCase(`memberId`)를 사용한다.

### 인증

모든 API는 로그인된 사용자 기준으로 동작한다.

```txt
Authorization: Bearer {accessToken}
```

### 응답 공통 포맷

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

### 공통 Enum

| Enum                 | Values                          |
| -------------------- | ------------------------------- |
| `RoleType`           | `ROLE_USER`, `ROLE_COMPANY`     |
| `MemberStatus`       | `ACTIVE`, `SUSPENDED`, `BANNED` |
| `SubscriptionStatus` | `FREE`, `PREMIUM`               |
| `NoticeStatus`       | `ACTIVE`, `CLOSED`              |
| `CareerLevel`        | `JUNIOR`, `SENIOR`, `ANY`       |
| `ScrapSort`          | `LATEST`                        |

### 공통 Error Cases

| statusCode | 상황                 | 프론트 처리       |
| ---------- | ------------------ | ------------ |
| `400`      | 잘못된 요청 또는 검색 조건 오류 | 입력값 확인 안내    |
| `401`      | 인증 필요 또는 토큰 만료     | 로그인 페이지 이동   |
| `403`      | 접근 권한 없음           | 접근 제한 안내     |
| `404`      | 회원 정보 또는 공고 데이터 없음 | 빈 상태 UI 표시   |
| `500`      | 서버 오류              | 재시도 또는 오류 안내 |

---

## 1. 내 정보 조회

* **Endpoint**: `GET /api/v1/dashboard/profile`

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

---

## 2. GitHub 연동 정보 조회

* **Endpoint**: `GET /api/v1/dashboard/github`

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

> 프론트는 `linked` 값을 기준으로 GitHub 연동 상태를 표시한다.

---

## 3. 회원 정보 수정

* **Endpoint**: `PATCH /api/v1/dashboard/profile`
* **Content-Type**: `application/json`

### Request

```json
{
  "name": "홍길동",
  "phone": "01011112222",
  "githubUrl": "https://github.com/careerwave-user"
}
```

| Field       | Type              | 필수 | 설명             |
| ----------- | ----------------- | -- | -------------- |
| `name`      | `string`          | Y  | 회원 이름          |
| `phone`     | `string`          | N  | 휴대폰 번호         |
| `githubUrl` | `string \| null` | N | GitHub 프로필 URL |

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

| statusCode | 상황                           |
| ---------- | ---------------------------- |
| `400`      | 이름, 휴대폰 번호, GitHub URL 형식 오류 |
| `401`      | 인증 필요 또는 토큰 만료               |
| `404`      | 회원 정보 없음                     |

---

## 4. 스크랩 공고 목록 조회

* **Endpoint**: `GET /api/v1/dashboard/bookmarks`

### Query Parameters

| Parameter | Type        | 필수 | 기본값      | 설명               |
| --------- | ----------- | -- | -------- | ---------------- |
| `keyword` | `string`    | N  | `""`     | 기업명 또는 공고 제목 검색어 |
| `sort`    | `ScrapSort` | N  | `LATEST` | 정렬 기준            |
| `page`    | `number`    | N  | `0`      | 0-based page     |
| `size`    | `number`    | N  | `10`     | 페이지 크기           |

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

---

## 5. 스크랩 취소

* **Endpoint**: `DELETE /api/v1/dashboard/bookmarks/{bookmarkId}`

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

| statusCode | 상황             |
| ---------- | -------------- |
| `401`      | 인증 필요 또는 토큰 만료 |
| `404`      | 존재하지 않는 스크랩    |
| `500`      | 서버 오류          |

---

## 6. 채용공고 상세 보기

스크랩 공고에서 채용공고 상세보기는 현재 Dashboard 화면 내에서 `JobNoticeDetail` 컴포넌트를 모달 형태로 표시한다.

### 동작

```txt
상세보기 클릭
→ 선택한 jobNoticeId 기준으로 JobNoticeDetail 모달 오픈
```

> 실제 상세 페이지 라우팅이 별도로 확정되는 경우, JobNotice 도메인 담당 구현 기준에 맞춰 이동 방식을 변경한다.
