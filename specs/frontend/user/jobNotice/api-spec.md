# API Specification: 사용자 채용 공고

- **Feature**: `user-job-notice`
- **Version**: `0.1.0`
- **Locale**: `ko-KR`
- **Owners**: `user-frontend`, `user-backend`
- **Base Path**: `/api/user/job-notices`
- **Shared By**: 목록 페이지, 상세 페이지

## 1. 개요

채용 공고 목록 페이지와 상세 드로어가 공통으로 사용하는 프론트엔드 API 계약이다.
목록 조회와 상세 조회는 공개 API로 제공하되, 로그인 상태에서는 사용자별 스크랩 여부를 함께 내려준다.
스크랩 저장과 해제는 로그인 사용자만 수행할 수 있다.

## 2. 인증 규칙

| 항목 | 값 |
|------|----|
| 목록/상세 읽기 | 비로그인 허용 |
| 스크랩 저장/해제 | 로그인 필요 |
| 로그인 유도 경로 | `/auth/login` |

## 3. 응답 래퍼

모든 Backend API 응답은 팀 Convention에 따라 `ApiResponse<T>` 형식을 사용한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 요청 성공 여부 |
| `statusCode` | number | HTTP 상태 코드 |
| `message` | string | 사용자 또는 개발자에게 전달할 응답 메시지 |
| `data` | `T \| null` | 성공 시 응답 데이터, 실패 시 기본 `null` |

### 성공 예시

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 실패 예시

```json
{
  "success": false,
  "statusCode": 400,
  "message": "지원하지 않는 필터 값입니다.",
  "data": null
}
```

### 응답 규칙

- Controller는 `Map` 또는 Entity를 직접 반환하지 않는다.
- 예상 가능한 실패는 `ErrorCode`와 공통 예외 흐름을 통해 `ApiResponse.fail(statusCode, message)` 형태로 반환한다.
- 프론트엔드는 `success`가 `false`이거나 HTTP 상태가 실패인 경우 `message`를 사용자 안내 문구로 활용한다.

## 4. Enum

| 이름 | 값 |
|------|----|
| `jobType` | `전체`, `백엔드`, `프론트엔드`, `데이터`, `DevOps` |
| `experience` | `전체`, `신입`, `1~3년`, `3~5년`, `5년 이상`, `경력무관` |
| `employmentType` | `전체`, `정규직`, `인턴`, `계약직` |
| `location` | `전체`, `서울`, `경기`, `원격` |
| `companySize` | `전체`, `스타트업`, `중견`, `대기업` |
| `period` | `today`, `7d`, `30d`, `all` |
| `sort` | `recommend`, `latest`, `views` |

## 5. Entity

### JobNoticeSummary

목록 카드에 표시되는 최소 공고 정보다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | number | O | 공고 고유 ID |
| `company` | string | O | 회사명 |
| `title` | string | O | 공고 제목 |
| `jobType` | string | O | 직무 분류 |
| `experience` | string | O | 경력 조건 |
| `employmentType` | string | O | 고용 형태 |
| `location` | string | O | 근무 지역 |
| `companySize` | string | O | 기업 규모 |
| `salary` | string | - | 급여 정보. 공개되지 않은 경우 `협의`로 내려온다. |
| `deadline` | string | O | 마감 정보. 예: `상시`, `D-7`, `2026-06-30` |
| `postedAt` | string | O | 게시일. `YYYY-MM-DD` 형식 |
| `tags` | string[] | O | 카드에 노출할 핵심 태그 |
| `source` | string | O | 공고 출처. 예: `그룹바이`, `직접등록`, `원티드` |
| `recommended` | boolean | O | 추천 배지 노출 여부 |
| `recommendScore` | number | O | 추천순 정렬에 사용하는 점수 |
| `views` | number | O | 조회수 |
| `bookmarked` | boolean | O | 현재 로그인 사용자의 스크랩 여부 |
| `originalUrl` | string | - | 원본 공고 URL |
| `stacks` | string[] | - | 기술 스택 |

### JobNoticeDetail

상세 드로어에서 표시하는 공고 상세 정보다. `JobNoticeSummary`의 모든 필드를 포함한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `industry` | string | 업종 |
| `responsibilities` | string[] | 담당 업무 |
| `requirements` | string[] | 필수 자격 요건 |
| `preferredQualifications` | string[] | 우대 사항 |
| `process` | string[] | 전형 절차 |
| `workConditions` | string[] | 근무 조건 |
| `companyDescription` | string | 기업 소개 |

## 6. Endpoints

### 6.1 채용 공고 목록 조회

| 항목 | 값 |
|------|----|
| ID | `getJobNoticeList` |
| Method | `GET` |
| Path | `/api/user/job-notices` |
| Auth | optional |
| Response | `ApiResponse<JobNoticeListResponse>` |

#### Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `keyword` | string | N | - | 회사명, 공고명, 직무, 기술 스택, 출처 통합 검색어 |
| `jobType` | string | N | - | 직무 필터. `전체` 선택 시 생략 |
| `experience` | string | N | - | 경력 필터. 범위 필터는 서버가 교집합 기준으로 처리 |
| `employmentType` | string | N | - | 채용 유형 필터 |
| `location` | string | N | - | 지역 필터 |
| `companySize` | string | N | - | 기업 규모 필터 |
| `period` | string | N | `all` | 게시일 기준 기간 필터 |
| `sort` | string | N | `recommend` | 추천순, 최신순, 조회순 정렬 |
| `page` | number | N | `1` | 페이지 번호. 최소 `1` |
| `size` | number | N | `18` | 페이지 크기. 최소 `1`, 최대 `60` |

#### Response Data

| 필드 | 타입 | 설명 |
|------|------|------|
| `items` | `JobNoticeSummary[]` | 목록 카드 데이터 |
| `page` | number | 현재 페이지 |
| `size` | number | 페이지 크기 |
| `totalItems` | number | 전체 결과 수 |
| `totalPages` | number | 전체 페이지 수 |
| `stats.totalOpenCount` | number | 전체 공개 공고 수 |
| `stats.todayNewCount` | number | 오늘 신규 공고 수 |
| `stats.todayNewDelta` | number | 전일 대비 신규 공고 증감 |
| `stats.todayNewRate` | number | 오늘 신규 공고 비율 |
| `filterOptions.jobType` | string[] | 직무 필터 옵션 |
| `filterOptions.experience` | string[] | 경력 필터 옵션 |
| `filterOptions.employmentType` | string[] | 채용 유형 필터 옵션 |
| `filterOptions.location` | string[] | 지역 필터 옵션 |
| `filterOptions.companySize` | string[] | 기업 규모 필터 옵션 |

#### Empty State

```json
{
  "success": true,
  "statusCode": 200,
  "message": "조건에 맞는 공고가 없습니다.",
  "data": {
    "items": []
  }
}
```

#### Errors

| ErrorCode | Status | Message |
|-----------|--------|---------|
| `INVALID_JOB_NOTICE_FILTER` | 400 | 지원하지 않는 필터 값입니다. |
| `JOB_NOTICE_LIST_UNAVAILABLE` | 503 | 채용 공고 목록을 불러올 수 없습니다. |

### 6.2 채용 공고 상세 조회

| 항목 | 값 |
|------|----|
| ID | `getJobNoticeDetail` |
| Method | `GET` |
| Path | `/api/user/job-notices/{jobNoticeId}` |
| Auth | optional |
| Response | `ApiResponse<JobNoticeDetail>` |

#### Path Parameters

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `jobNoticeId` | number | O | 상세 조회할 공고 ID |

#### Errors

| ErrorCode | Status | Message |
|-----------|--------|---------|
| `JOB_NOTICE_NOT_FOUND` | 404 | 공고 정보를 찾을 수 없습니다. |
| `JOB_NOTICE_CLOSED` | 410 | 마감되었거나 비공개 처리된 공고입니다. |

### 6.3 채용 공고 스크랩 토글

| 항목 | 값 |
|------|----|
| ID | `toggleJobNoticeBookmark` |
| Method | `PATCH` |
| Path | `/api/user/job-notices/{jobNoticeId}/bookmark` |
| Auth | required |
| Response | `ApiResponse<JobNoticeBookmarkResponse>` |

#### Path Parameters

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `jobNoticeId` | number | O | 스크랩 저장 또는 해제할 공고 ID |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `bookmarked` | boolean | O | `true`면 스크랩 저장, `false`면 스크랩 해제 |

#### Response Data

| 필드 | 타입 | 설명 |
|------|------|------|
| `jobNoticeId` | number | 공고 ID |
| `bookmarked` | boolean | 최종 스크랩 여부 |
| `scrapCount` | number | 해당 공고의 전체 스크랩 수 |

#### Errors

| ErrorCode | Status | Message |
|-----------|--------|---------|
| `UNAUTHORIZED` | 401 | 로그인이 필요한 기능입니다. |
| `JOB_NOTICE_NOT_FOUND` | 404 | 공고 정보를 찾을 수 없습니다. |

## 7. Frontend Mapping

| 항목 | 경로 |
|------|------|
| 목록 페이지 | `frontend/src/user/pages/jobNotice/JobNoticeListPage.tsx` |
| 상세 드로어 | `frontend/src/user/pages/jobNotice/JobNoticeDetail.tsx` |
| 공유 타입 | `frontend/src/user/pages/jobNotice/JobNoticeTypes.ts` |
| API 모듈 | `frontend/src/user/api/jobApi.js` 또는 `frontend/src/user/api/jobNoticeApi.ts` |
| API 클라이언트 | `frontend/src/utils/apiClient.js` |

## 8. Notes

- 목록과 상세는 동일한 `id`와 `bookmarked` 값을 공유해야 한다.
- 목록 조회는 공개 API이지만 로그인 상태에서는 사용자별 스크랩 여부를 함께 내려준다.
- 원본 공고 이동은 `originalUrl`이 있을 때 해당 URL을 사용하고, 없을 때는 검색 URL fallback을 사용한다.
