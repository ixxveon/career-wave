# API Schema: Dashboard

> Dashboard 도메인의 프론트엔드, 백엔드, FastAPI 간 데이터 전달 구조를 정의한다.
> 본 문서는 화면 구현에 필요한 JSON 데이터 계약을 정의한다.
> 현재 ERD가 최종 확정 전이므로, 본 문서는 ERD 초안을 기준으로 작성한다.
> ERD 최종 확정 후 필드명과 타입은 변경될 수 있다.

---

## 1. User Profile

내 정보 관리 화면에서 사용하는 사용자 기본 정보 데이터이다.

```json
{
  "memberId": "550e8400-e29b-41d4-a716-446655440000",
  "loginId": "user01",
  "email": "user@example.com",
  "name": "김지원",
  "phone": "010-1234-5678",
  "roleType": "ROLE_USER",
  "memberStatus": "ACTIVE",
  "subscriptionStatus": "FREE",
  "createdAt": "2026-05-01T10:00:00"
}
```

| Field              | Type        | Required | Description |
| ------------------ | ----------- | -------- | ----------- |
| memberId           | string      | Y        | 회원 고유 식별자   |
| loginId            | string      | Y        | 로그인 계정      |
| email              | string/null | N        | 이메일 주소      |
| name               | string      | Y        | 회원 이름       |
| phone              | string/null | N        | 휴대폰 번호      |
| roleType           | string      | Y        | 회원 유형       |
| memberStatus       | string      | Y        | 계정 상태       |
| subscriptionStatus | string      | Y        | 구독 상태       |
| createdAt          | string      | Y        | 가입 일시       |

---

## 2. Github Profile

GitHub 연동 정보 조회에 사용하는 데이터이다.
GitHub OAuth 연동 구현은 v2 범위로 두고, v1에서는 GitHub URL 존재 여부를 기준으로 연동 상태를 표시한다.

```json
{
  "githubUrl": "https://github.com/careerwave-user",
  "linked": true
}
```

### GitHub Not Linked

```json
{
  "githubUrl": null,
  "linked": false
}
```

| Field     | Type        | Required | Description    |
| --------- | ----------- | -------- | -------------- |
| githubUrl | string/null | N        | GitHub 프로필 URL |
| linked    | boolean     | Y        | GitHub 연동 여부   |

---

## 3. Update User Profile Request

회원 정보 수정 요청 데이터이다.

```json
{
  "name": "김지원",
  "phone": "010-1111-2222",
  "githubUrl": "https://github.com/careerwave-user"
}
```

| Field     | Type        | Required | Description        |
| --------- | ----------- | -------- | ------------------ |
| name      | string      | Y        | 수정할 회원 이름          |
| phone     | string/null | N        | 수정할 휴대폰 번호         |
| githubUrl | string/null | N        | 수정할 GitHub 프로필 URL |

---

## 4. Scrap Job

스크랩 공고 목록에서 사용하는 단일 공고 데이터이다.

```json
{
  "bookmarkId": 1,
  "jobNoticeId": 101,
  "companyName": "커리어웨이브",
  "title": "프론트엔드 개발자 채용",
  "careerLevel": "JUNIOR",
  "location": "서울",
  "deadline": "2026-06-30",
  "noticeStatus": "ACTIVE",
  "createdAt": "2026-05-20T10:00:00"
}
```

| Field        | Type        | Required | Description |
| ------------ | ----------- | -------- | ----------- |
| bookmarkId   | number      | Y        | 북마크 고유 식별자  |
| jobNoticeId  | number      | Y        | 채용공고 고유 식별자 |
| companyName  | string/null | N        | 공고 게시 기업명   |
| title        | string      | Y        | 채용공고 제목     |
| careerLevel  | string/null | N        | 경력 조건       |
| location     | string/null | N        | 근무지         |
| deadline     | string/null | N        | 지원 마감일      |
| noticeStatus | string      | Y        | 공고 상태       |
| createdAt    | string      | Y        | 스크랩 일시      |

---

## 5. Scrap Job List

스크랩 공고 목록 조회 응답 데이터이다.

```json
{
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
      "createdAt": "2026-05-20T10:00:00"
    }
  ]
}
```

### Empty Response

```json
{
  "content": []
}
```

---

## 6. Scrap Job Search Condition

스크랩 공고 검색 및 정렬에 사용하는 요청 조건이다.

```json
{
  "keyword": "프론트엔드",
  "sort": "LATEST",
  "page": 0,
  "size": 10
}
```

| Field   | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| keyword | string | N        | 검색어         |
| sort    | string | N        | 정렬 기준       |
| page    | number | N        | 페이지 번호      |
| size    | number | N        | 페이지 크기      |

### Sort Type

| Value  | Description |
| ------ | ----------- |
| LATEST | 최신순         |

---

## 7. Delete Scrap Response

스크랩 삭제 성공 응답 데이터이다.

```json
{
  "deletedBookmarkId": 1
}
```

---

## Notes

* 사용자 인증 및 로그인 기능은 `members` 테이블과 Member 도메인에서 관리한다.
* GitHub 프로필 URL은 `personal_profiles.github_url` 값을 기준으로 한다.
* 스크랩 공고는 `bookmarks`와 `job_notices` 테이블을 기준으로 한다.
* 채용공고 상세 조회 기능은 JobNotice 도메인에서 제공한다.
* GitHub OAuth 연동 구현은 v2 범위로 분리한다.
* Dashboard 문서에서는 내 정보 관리, GitHub 연동 상태 조회, 스크랩 공고 관리에 필요한 데이터 구조만 정의한다.
