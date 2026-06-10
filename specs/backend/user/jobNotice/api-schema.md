# API Schema: JobNotice User Backend

> 백엔드와 프론트엔드 간 JobNotice 사용자 API 계약 문서.
> 본 문서는 기능 설명이 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 페이지 Query Parameter `page`는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 공통 오류 코드는 `global.exception.ErrorCode`에서 관리하고, JobNotice 전용 오류 코드는 도메인 `exception` 패키지에서 별도로 관리한다.

### 권한 표기

문서상 권한 표기는 `Optional`, `USER`를 사용한다.
Spring Security에서는 각각 Optional 인증 처리와 `ROLE_USER` 권한으로 매핑한다.

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
| `jobType` | `FULLTIME`, `INTERN`, `CONTRACT` |
| `companySize` | `STARTUP`, `SME`, `LARGE` |
| `careerLevel` | `JUNIOR`, `SENIOR`, `ANY` |
| `noticeStatus` | `ACTIVE`, `CLOSED` |

---

## 3. 사용자 채용 공고 API

### 3.1 GET /api/v1/user/job-notices

- **Method**: `GET`
- **Path**: `/api/v1/user/job-notices`
- **Auth**: `Optional`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | N | 검색어 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT` | N | 채용 유형 |
| `jobCategory` | `string` | N | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY` | N | 경력 수준 |
| `location` | `string` | N | 지역 |
| `companySize` | `STARTUP \| SME \| LARGE` | N | 회사 규모 |
| `period` | `string` | N | 기간 필터 |
| `sort` | `string` | N | 정렬 |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response Body

`ApiResponse<JobNoticeDTO.ResponsePage>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "채용 공고 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "jobNoticeId": 101,
        "companyName": "CareerWave",
        "title": "백엔드 개발자",
        "skillTags": ["Java", "Spring Boot"],
        "jobType": "FULLTIME",
        "companySize": "STARTUP",
        "jobCategory": "BACKEND",
        "careerLevel": "JUNIOR",
        "location": "Seoul",
        "salary": "면접 후 협의",
        "noticeStatus": "ACTIVE",
        "source": "WANTED",
        "viewCount": 123,
        "deadline": "2026-06-30",
        "createdAt": "2026-06-01T00:00:00Z",
        "bookmarked": false
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Optional 인증 응답 차이

- **비로그인 요청**: `bookmarked`는 항상 `false`
- **로그인 요청**: 현재 로그인 사용자의 북마크 여부를 반영

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `INVALID_JOB_NOTICE_FILTER` | 400 | 유효하지 않은 공고 조회 필터입니다. |
| `INVALID_PAGE_REQUEST` | 400 | 유효하지 않은 페이지 요청입니다. |

---

### 3.2 GET /api/v1/user/job-notices/{jobNoticeId}

- **Method**: `GET`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}`
- **Auth**: `Optional`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<JobNoticeDTO.ResponseDetail>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "채용 공고 상세 조회에 성공했습니다.",
  "data": {
    "jobNoticeId": 101,
    "companyName": "CareerWave",
    "title": "백엔드 개발자",
    "description": "Spring Boot 기반 백엔드 개발",
    "skillTags": ["Java", "Spring Boot"],
    "jobType": "FULLTIME",
    "companySize": "STARTUP",
    "jobCategory": "BACKEND",
    "careerLevel": "JUNIOR",
    "location": "Seoul",
    "salary": "면접 후 협의",
    "noticeStatus": "ACTIVE",
    "originalUrl": "https://example.com/job/101",
    "source": "WANTED",
    "viewCount": 123,
    "deadline": "2026-06-30",
    "createdAt": "2026-06-01T00:00:00Z",
    "updatedAt": "2026-06-01T00:00:00Z",
    "bookmarked": true
  }
}
```

#### Optional 인증 응답 차이

- **비로그인 요청**: `bookmarked = false`
- **로그인 요청**: 현재 로그인 사용자의 북마크 여부 반영

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |
| `JOB_NOTICE_CLOSED` | 410 | 공개 중이 아닌 채용 공고입니다. |

---

### 3.3 POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks

- **Method**: `POST`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- **Auth**: `USER`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<JobNoticeDTO.ResponseBookmark>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "북마크가 등록되었습니다.",
  "data": {
    "jobNoticeId": 101,
    "bookmarked": true
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `UNAUTHORIZED` | 401 | 로그인이 필요합니다. |
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |
| `JOB_NOTICE_CLOSED` | 410 | 공개 중이 아닌 채용 공고입니다. |
| `BOOKMARK_ALREADY_EXISTS` | 409 | 이미 북마크한 채용 공고입니다. |

---

### 3.4 DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks

- **Method**: `DELETE`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- **Auth**: `USER`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<JobNoticeDTO.ResponseBookmark>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "북마크가 해제되었습니다.",
  "data": {
    "jobNoticeId": 101,
    "bookmarked": false
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `UNAUTHORIZED` | 401 | 로그인이 필요합니다. |
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |
| `BOOKMARK_NOT_FOUND` | 404 | 북마크 정보를 찾을 수 없습니다. |

---

## 4. DTO 계약 표

### 4.1 JobNoticeDTO

#### `JobNoticeDTO.ResponseSummary`

| Field | Type | Required | Description |
|---|---|---|---|
| `jobNoticeId` | `number` | Y | 채용 공고 ID |
| `companyName` | `string` | Y | 회사명 |
| `title` | `string` | Y | 공고 제목 |
| `skillTags` | `string[]` | Y | 기술 태그 목록 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT` | Y | 채용 유형 |
| `companySize` | `STARTUP \| SME \| LARGE` | Y | 회사 규모 |
| `jobCategory` | `string` | Y | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY` | Y | 경력 수준 |
| `location` | `string` | Y | 지역 |
| `salary` | `string \| null` | N | 급여 정보 |
| `noticeStatus` | `ACTIVE \| CLOSED` | Y | 공고 상태 |
| `source` | `string` | Y | 공고 출처 |
| `viewCount` | `number` | Y | 조회 수 |
| `deadline` | `string \| null` | N | 마감일 |
| `createdAt` | `string` | Y | 생성 시각 |
| `bookmarked` | `boolean` | Y | 현재 사용자 북마크 여부 |

#### `JobNoticeDTO.ResponseDetail`

| Field | Type | Required | Description |
|---|---|---|---|
| `jobNoticeId` | `number` | Y | 채용 공고 ID |
| `companyName` | `string` | Y | 회사명 |
| `title` | `string` | Y | 공고 제목 |
| `description` | `string` | Y | 공고 설명 |
| `skillTags` | `string[]` | Y | 기술 태그 목록 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT` | Y | 채용 유형 |
| `companySize` | `STARTUP \| SME \| LARGE` | Y | 회사 규모 |
| `jobCategory` | `string` | Y | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY` | Y | 경력 수준 |
| `location` | `string` | Y | 지역 |
| `salary` | `string \| null` | N | 급여 정보 |
| `noticeStatus` | `ACTIVE \| CLOSED` | Y | 공고 상태 |
| `originalUrl` | `string` | Y | 원문 URL |
| `source` | `string` | Y | 공고 출처 |
| `viewCount` | `number` | Y | 조회 수 |
| `deadline` | `string \| null` | N | 마감일 |
| `createdAt` | `string` | Y | 생성 시각 |
| `updatedAt` | `string` | Y | 수정 시각 |
| `bookmarked` | `boolean` | Y | 현재 사용자 북마크 여부 |

#### `JobNoticeDTO.ResponseBookmark`

| Field | Type | Required | Description |
|---|---|---|---|
| `jobNoticeId` | `number` | Y | 채용 공고 ID |
| `bookmarked` | `boolean` | Y | 북마크 상태 |

#### `JobNoticeDTO.ResponsePage`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `JobNoticeDTO.ResponseSummary[]` | Y | 목록 데이터 |
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

### 5.2 JobNotice Domain ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `INVALID_JOB_NOTICE_FILTER` | 400 | 채용 공고 목록 조회 필터 값이 유효하지 않음 |
| `INVALID_PAGE_REQUEST` | 400 | `page` 또는 `size` 값이 유효하지 않음 |
| `JOB_NOTICE_NOT_FOUND` | 404 | 요청한 채용 공고가 존재하지 않음 |
| `JOB_NOTICE_CLOSED` | 410 | 공개 중이 아닌 채용 공고임 |
| `BOOKMARK_ALREADY_EXISTS` | 409 | 동일 사용자와 동일 공고의 북마크가 이미 존재함 |
| `BOOKMARK_NOT_FOUND` | 404 | 해제 대상 북마크가 존재하지 않음 |

---

## 6. Migration Note

본 문서는 JobNotice 사용자 백엔드의 최신 API 계약을 기준으로 한다. 현재 프론트엔드에 남아 있는 구계약과 차이가 있을 수 있으며, 프론트엔드는 후속 작업에서 아래 기준으로 정렬되어야 한다.

### 6.1 Breaking Changes

- 북마크 API는 단일 토글 방식 `PATCH /api/v1/user/job-notices/{jobNoticeId}/bookmark` 구계약 대신 아래 최신 계약을 사용한다.
  - `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks`
  - `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- JobNotice 응답 DTO 필드명은 최신 스펙 기준을 사용한다.
  - `id` -> `jobNoticeId`
  - `company` -> `companyName`
  - `tags` -> `skillTags`
  - `postedAt` -> `createdAt`
  - `views` -> `viewCount`
- 페이지 응답 필드명은 최신 스펙 기준을 사용한다.
  - `items` -> `content`
  - `totalItems` -> `totalElements`
- 기존 프론트 타입의 `scrapCount`, `stats`, `filterOptions`는 본 JobNotice 사용자 백엔드 스펙 범위에 포함되지 않으므로, 필요 시 별도 프론트 후속 작업에서 정렬한다.

### 6.2 Frontend Follow-up Scope

- `frontend/src/types/user/jobNotice.ts` 타입 정의 갱신
- JobNotice API client 요청/응답 매핑 수정
- 북마크 토글 UI를 create/delete 호출 방식으로 변경
- 페이지네이션 및 목록 렌더링 필드명 반영
- 구계약 의존 mock/test fixture 제거 또는 갱신
