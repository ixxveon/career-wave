# Checklist: jobNotice

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — Entity

- [ ] `JobNotice` 엔티티 필드가 `job_notices` ERD 컬럼명, nullable 조건, PK/UNIQUE/CHECK 제약과 일치한다.
- [ ] `Bookmark` 엔티티 필드가 `bookmarks` ERD 컬럼명, PK/UNIQUE/FK 제약과 일치한다.
- [ ] `JobNoticeStatus`, `JobType`, `CompanySize`, `CareerLevel` Enum 값이 DB CHECK 제약조건과 일치한다.
- [ ] `JobNoticeRepository`가 공개 공고 목록 조회와 상세 조회에 필요한 쿼리를 제공한다.
- [ ] `JobNoticeQueryRepository`가 QueryDSL 기반 동적 검색 조건, 정렬, 페이지네이션 쿼리를 제공한다.
- [ ] `BookmarkRepository`가 북마크 존재 여부 확인과 삭제 대상 조회에 필요한 쿼리를 제공한다.
- [ ] 목록 조회 Query Parameter와 Repository 쿼리 조건의 ERD 컬럼 매핑이 `api-schema.md`와 일치한다.

## Phase 2 — Repository & QueryDSL

- [ ] `JobNoticeRepository`가 공개 공고 목록 조회와 상세 조회에 필요한 쿼리를 제공한다.
- [ ] `JobNoticeQueryRepository`가 QueryDSL 기반 동적 검색 조건, 정렬, 페이지네이션 쿼리를 제공한다.
- [ ] `BookmarkRepository`가 북마크 존재 여부 확인과 삭제 대상 조회에 필요한 쿼리를 제공한다.
- [ ] 목록 조회 Query Parameter와 Repository 쿼리 조건의 ERD 컬럼 매핑이 `api-schema.md`와 일치한다.
- [ ] `jobCategory` Query Parameter가 `job_notices.job_category` 배열 컬럼 조건으로 해석된다.
- [ ] `keyword` 검색 범위가 `title`, `description`, `company_name`, `skill_tags`, `job_category`, `source`에 대해 일관되게 적용된다.
- [ ] 외부 API 기준 `page` 1-based 계약이 유지되고 내부 Pageable 변환 시 `page - 1`이 적용된다.

## Phase 3 — Service

- [ ] 비즈니스 로직이 Controller가 아니라 Service Layer에 위치한다.
- [ ] Service가 인터페이스와 `impl` 구현체로 분리되어 있다.
- [ ] `notice_status` 노출 정책과 북마크 중복 정책이 Service Layer에서 일관되게 적용된다.
- [ ] 비로그인 목록/상세 조회 응답의 `bookmarked` 값이 항상 `false`다.
- [ ] 로그인 목록/상세 조회 응답의 `bookmarked` 값이 현재 사용자 기준으로 계산된다.
- [ ] 비즈니스 예외가 `CustomException(ErrorCode)` 또는 도메인 ErrorCode 매핑 방식으로 처리된다.
- [ ] JobNotice 도메인 오류 코드 `JOB_NOTICE_NOT_FOUND`, `BOOKMARK_ALREADY_EXISTS`, `BOOKMARK_NOT_FOUND`가 구현과 문서에 반영되어 있다.
- [ ] 공통 ErrorCode와 도메인 ErrorCode의 역할 분리가 유지된다.

## Phase 4 — API

- [ ] `GET /api/v1/user/job-notices`가 구현되어 정상 응답을 반환한다.
- [ ] `GET /api/v1/user/job-notices/{jobNoticeId}`가 구현되어 정상 응답을 반환한다.
- [ ] `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks`가 구현되어 정상 응답을 반환한다.
- [ ] `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks`가 구현되어 정상 응답을 반환한다.
- [ ] 모든 성공 응답이 `ApiResponse<T>` 래퍼 형식을 사용한다.
- [ ] 모든 성공 응답이 `success`, `message`, `data` 필드만 사용하고 `statusCode`를 포함하지 않는다.
- [ ] 목록 조회 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 사용한다.
- [ ] 상세 조회 및 북마크 API에 `page`, `size` Query Parameter가 노출되지 않는다.
- [ ] 사용자 조회 API는 `notice_status = ACTIVE` 공고만 노출한다.
- [ ] 북마크 등록/해제 API의 권한 정책이 문서상 `USER`, 구현상 `ROLE_USER`와 일치한다.

## Phase 5 — Documentation

- [ ] `UserJobNoticeControllerDocs` 인터페이스가 작성되어 있다.
- [ ] Swagger 어노테이션이 Controller에 직접 작성되지 않고 `docs` 인터페이스에 분리되어 있다.
- [ ] Swagger 문서의 Method, Path, Auth, Query Parameter, Request Body, Response Body, Error Response가 실제 구현과 일치한다.
- [ ] `api-schema.md`에 `sort`, `period` 허용값이 최신 계약 기준으로 명시되어 있다.
- [ ] 최신 스펙과 프론트엔드 구계약 간 Breaking Change / Migration Note가 문서에 명시되어 있다.
- [ ] `spec.md`, `constitution.md`, `plan.md`, `tasks.md`의 구현 범위와 실제 구현 범위가 일치한다.

## Phase 6 — Test

- [ ] 공개 공고 목록/상세 조회 정상 케이스 테스트가 존재한다.
- [ ] 비로그인 조회, 로그인 조회 북마크 계산, 북마크 등록/해제 테스트가 존재한다.
- [ ] 중복 북마크 등록, 존재하지 않는 북마크 해제, 비공개/미존재 공고 조회 테스트가 존재한다.
- [ ] QueryDSL 동적 검색 조건 테스트와 정렬 조건 테스트가 존재한다.

## 코드 품질

- [ ] Entity, `Map`, 임의 JSON 구조를 Controller에서 직접 반환하지 않는다.

## FastAPI / 외부 연동 / Audit Log

- [ ] JobNotice 사용자 기능 구현에 Spring ↔ FastAPI 호출 코드가 없다.
- [ ] FastAPI가 JobNotice 사용자 기능을 위해 DB에 직접 접근하지 않도록 설계/구현되어 있다.
- [ ] 외부 채용 플랫폼은 `original_url` 링크 제공 대상으로만 취급되고, 외부 API 호출 의존이 구현에 포함되지 않는다.
- [ ] Audit Log 기록이 필요한 정책이 별도로 있다면 조회/북마크 행위의 기록 여부가 정책과 일치한다.
- [ ] Audit Log 비적용이 정책이라면, 본 도메인 구현에 불필요한 감사 로그 의존성이 추가되지 않았다.

## 머지 전 최종 확인

- [ ] `constitution.md`의 불변 규칙이 구현과 테스트에서 모두 지켜진다.
- [ ] `tasks.md`의 모든 작업 항목이 완료되었거나 미완료 사유가 PR에 정리되어 있다.
- [ ] 사용자 JobNotice 구현 범위에 관리자 기능, 스크래핑, AI 메트릭스, FastAPI 연동 로직이 혼입되지 않았다.
- [ ] 프론트엔드가 최신 스펙으로 정렬되었거나, 남아 있는 구계약 차이가 PR 또는 스펙 문서의 migration note에 정리되어 있다.
