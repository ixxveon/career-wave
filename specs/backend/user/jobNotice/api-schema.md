# API Schema: jobNotice

> 백엔드와 프론트엔드 간 `jobNotice` 사용자 API 계약 문서.
> 본 문서는 기능 설명 문서가 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 모든 page Query Parameter는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서의 ErrorCode 표에는 `jobNotice` 도메인 코드만 작성한다.

### 권한 표기

- 문서상 권한 표기는 `Optional`, `USER`를 사용한다.
- Spring Security에서는 `USER -> ROLE_USER`로 매핑한다.

### Pagination 규칙

- 목록 조회 API만 `page`, `size`를 사용한다.
- 상세 조회 API는 `page`, `size`를 사용하지 않는다.
- 생성/삭제 API는 `page`, `size`를 사용하지 않는다.

### 공통 응답 래퍼

```json
{
  "success": true,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 공통 페이지 응답

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
  "message": "채용 공고를 찾을 수 없습니다.",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | ERD CHECK 제약 |
|---|---|---|
| `JobType` | `FULLTIME`, `INTERN`, `CONTRACT` | `job_notices.job_type` |
| `CompanySizeType` | `STARTUP`, `SME`, `LARGE` | `job_notices.company_size` |
| `CareerLevelType` | `JUNIOR`, `SENIOR`, `ANY` | `job_notices.career_level` |
| `JobNoticeStatusType` | `ACTIVE`, `CLOSED` | `job_notices.notice_status` |

---

## 3. Query Parameter -> ERD 컬럼 매핑

### GET /api/v1/user/job-notices

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `keyword` | `string` | `job_notices.title`, `job_notices.description`, `job_notices.company_name`, `job_notices.skill_tags`, `job_notices.job_category`, `job_notices.source` | 검색어 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT` | `job_notices.job_type` | 채용 유형 |
| `jobCategory` | `string` | `job_notices.job_category` | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY` | `job_notices.career_level` | 경력 수준 |
| `location` | `string` | `job_notices.location` | 지역 |
| `companySize` | `STARTUP \| SME \| LARGE` | `job_notices.company_size` | 회사 규모 |
| `period` | `today \| 7d \| 30d \| all` | `job_notices.created_at`, `job_notices.deadline` | 기간 필터 |
| `sort` | `recommend \| latest \| views` | `job_notices.created_at`, `job_notices.deadline`, `job_notices.view_count` | 정렬 |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

> `jobCategory`는 단일 Query Parameter로 전달되며, 백엔드에서는 `job_notices.job_category` 배열 컬럼 필터 조건으로 해석한다.
> `period` 허용값은 `today`, `7d`, `30d`, `all`이다.
> `sort` 허용값은 `recommend`, `latest`, `views`이다.

---

## 4. 사용자 채용 공고 API

### 4.1 GET /api/v1/user/job-notices

- **Method**: `GET`
- **Path**: `/api/v1/user/job-notices`
- **Auth**: `Optional`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `keyword` | `string` | N | `job_notices.title`, `job_notices.description`, `job_notices.company_name`, `job_notices.skill_tags`, `job_notices.job_category`, `job_notices.source` | 검색어 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT` | N | `job_notices.job_type` | 채용 유형 |
| `jobCategory` | `string` | N | `job_notices.job_category` | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY` | N | `job_notices.career_level` | 경력 수준 |
| `location` | `string` | N | `job_notices.location` | 지역 |
| `companySize` | `STARTUP \| SME \| LARGE` | N | `job_notices.company_size` | 회사 규모 |
| `period` | `today \| 7d \| 30d \| all` | N | `job_notices.created_at`, `job_notices.deadline` | 기간 필터 |
| `sort` | `recommend \| latest \| views` | N | `job_notices.created_at`, `job_notices.deadline`, `job_notices.view_count` | 정렬 |
| `page` | `number` | N | 없음 | 페이지 번호, 1-based |
| `size` | `number` | N | 없음 | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<JobNoticeDTO.ResponseList>`

```json
{
  "success": true,
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
        "jobCategory": ["BACKEND"],
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

- 비로그인 요청: `bookmarked`는 항상 `false`
- 로그인 요청: 현재 로그인 사용자의 북마크 여부를 반영

#### Error Response

없음

> 목록 조회는 공개 상태 공고만 필터링해 반환하며, 조건에 맞는 결과가 없으면 오류 대신 빈 `content` 배열을 반환한다.

---

### 4.2 GET /api/v1/user/job-notices/{jobNoticeId}

- **Method**: `GET`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}`
- **Auth**: `Optional`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<JobNoticeDTO.ResponseDetail>`

```json
{
  "success": true,
  "message": "채용 공고 상세 조회에 성공했습니다.",
  "data": {
    "jobNoticeId": 101,
    "companyName": "CareerWave",
    "title": "백엔드 개발자",
    "description": "Spring Boot 기반 백엔드 개발",
    "skillTags": ["Java", "Spring Boot"],
    "jobType": "FULLTIME",
    "companySize": "STARTUP",
    "jobCategory": ["BACKEND"],
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

- 비로그인 요청: `bookmarked`는 항상 `false`
- 로그인 요청: 현재 로그인 사용자의 북마크 여부를 반영

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |

---

### 4.3 POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks

- **Method**: `POST`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- **Auth**: `USER`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<JobNoticeDTO.ResponseBookmark>`

```json
{
  "success": true,
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
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |
| `BOOKMARK_ALREADY_EXISTS` | 409 | 이미 북마크한 채용 공고입니다. |

---

### 4.4 DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks

- **Method**: `DELETE`
- **Path**: `/api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- **Auth**: `USER`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<JobNoticeDTO.ResponseBookmark>`

```json
{
  "success": true,
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
| `JOB_NOTICE_NOT_FOUND` | 404 | 채용 공고를 찾을 수 없습니다. |
| `BOOKMARK_NOT_FOUND` | 404 | 북마크 정보를 찾을 수 없습니다. |

---

## 5. DTO 계약 표

### 5.1 `JobNoticeDTO.ResponseSummary`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `jobNoticeId` | `number` | Y | `job_notices.job_notice_id` | 채용 공고 ID |
| `companyName` | `string \| null` | N | `job_notices.company_name` | 회사명 |
| `title` | `string` | Y | `job_notices.title` | 공고 제목 |
| `skillTags` | `string[] \| null` | N | `job_notices.skill_tags` | 기술 태그 목록 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT \| null` | N | `job_notices.job_type` | 채용 유형 |
| `companySize` | `STARTUP \| SME \| LARGE \| null` | N | `job_notices.company_size` | 회사 규모 |
| `jobCategory` | `string[] \| null` | N | `job_notices.job_category` | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY \| null` | N | `job_notices.career_level` | 경력 수준 |
| `location` | `string \| null` | N | `job_notices.location` | 지역 |
| `salary` | `string \| null` | N | `job_notices.salary` | 급여 정보 |
| `noticeStatus` | `ACTIVE \| CLOSED` | Y | `job_notices.notice_status` | 공고 상태 |
| `source` | `string` | Y | `job_notices.source` | 공고 출처 |
| `viewCount` | `number` | Y | `job_notices.view_count` | 조회 수 |
| `deadline` | `string \| null` | N | `job_notices.deadline` | 마감일 |
| `createdAt` | `string` | Y | `job_notices.created_at` | 생성 시각 |
| `bookmarked` | `boolean` | Y | 없음 | 현재 사용자 북마크 여부 |

### 5.2 `JobNoticeDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `JobNoticeDTO.ResponseSummary[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

### 5.3 `JobNoticeDTO.ResponseDetail`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `jobNoticeId` | `number` | Y | `job_notices.job_notice_id` | 채용 공고 ID |
| `companyName` | `string \| null` | N | `job_notices.company_name` | 회사명 |
| `title` | `string` | Y | `job_notices.title` | 공고 제목 |
| `description` | `string \| null` | N | `job_notices.description` | 공고 설명 |
| `skillTags` | `string[] \| null` | N | `job_notices.skill_tags` | 기술 태그 목록 |
| `jobType` | `FULLTIME \| INTERN \| CONTRACT \| null` | N | `job_notices.job_type` | 채용 유형 |
| `companySize` | `STARTUP \| SME \| LARGE \| null` | N | `job_notices.company_size` | 회사 규모 |
| `jobCategory` | `string[] \| null` | N | `job_notices.job_category` | 직무/직군 |
| `careerLevel` | `JUNIOR \| SENIOR \| ANY \| null` | N | `job_notices.career_level` | 경력 수준 |
| `location` | `string \| null` | N | `job_notices.location` | 지역 |
| `salary` | `string \| null` | N | `job_notices.salary` | 급여 정보 |
| `noticeStatus` | `ACTIVE \| CLOSED` | Y | `job_notices.notice_status` | 공고 상태 |
| `originalUrl` | `string` | Y | `job_notices.original_url` | 원문 URL |
| `source` | `string` | Y | `job_notices.source` | 공고 출처 |
| `viewCount` | `number` | Y | `job_notices.view_count` | 조회 수 |
| `deadline` | `string \| null` | N | `job_notices.deadline` | 마감일 |
| `createdAt` | `string` | Y | `job_notices.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | `job_notices.updated_at` | 수정 시각 |
| `bookmarked` | `boolean` | Y | 없음 | 현재 사용자 북마크 여부 |

### 5.4 `JobNoticeDTO.ResponseBookmark`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `jobNoticeId` | `number` | Y | `job_notices.job_notice_id` | 채용 공고 ID |
| `bookmarked` | `boolean` | Y | 없음 | 북마크 상태 |

---

## 6. ErrorCode 계약 표

| ErrorCode | HTTP | Description |
|---|---|---|
| `JOB_NOTICE_NOT_FOUND` | 404 | 요청한 채용 공고가 존재하지 않음 |
| `BOOKMARK_ALREADY_EXISTS` | 409 | 동일 사용자와 동일 공고의 북마크가 이미 존재함 |
| `BOOKMARK_NOT_FOUND` | 404 | 해제 대상 북마크가 존재하지 않음 |

---

## 7. 참고 사항

- 인증/인가 실패(`401`, `403`)는 공통 보안 예외 처리 범위이며, 본 문서의 도메인 ErrorCode 표에는 포함하지 않는다.
- `bookmarked`는 `bookmarks.member_id`, `bookmarks.job_notice_id` 관계를 기준으로 계산되는 응답 필드이며 `job_notices` 단일 컬럼에 직접 매핑되지 않는다.
- `POST`, `DELETE /bookmarks`는 Request Body가 없고, `page`, `size`를 사용하지 않는다.

## 8. Breaking Change & Migration Note

- 본 문서는 사용자 JobNotice의 최신 백엔드 API 계약 기준이다.
- 현재 프론트엔드 구현이 사용하는 `PATCH /api/v1/user/job-notices/{jobNoticeId}/bookmark` 토글 계약은 구계약으로 본다.
- 프론트엔드는 최신 계약인 `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks`, `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks` 기준으로 마이그레이션되어야 한다.
- 프론트엔드의 기존 응답 타입 `statusCode`, `items`, `totalItems`, `JobNoticeSummary.id/company/tags/postedAt/views`, `JobNoticeBookmarkResponse.scrapCount` 의존 코드는 후속 작업에서 최신 스펙 기준으로 정렬되어야 한다.
