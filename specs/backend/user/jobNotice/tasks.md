# Tasks: jobNotice

> plan.md의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - Entity

- [x] `JobNotice.java` 엔티티를 ERD 컬럼 기준으로 작성한다.
- [x] `Bookmark.java` 엔티티를 ERD 컬럼 기준으로 작성한다.
- [x] `JobNoticeStatus.java` Enum을 작성한다.
- [x] `JobType.java` Enum을 작성한다.
- [x] `CompanySize.java` Enum을 작성한다.
- [x] `CareerLevel.java` Enum을 작성한다.

## Phase 2 - Repository & QueryDSL

- [x] `JobNoticeRepository.java` 기본 조회 인터페이스를 작성한다.
- [x] QueryDSL 설정을 적용한다.
- [x] `JobNoticeQueryRepository.java`를 작성한다.
- [x] 공개 채용 공고 목록 동적 검색 조건 쿼리를 구현한다.
- [x] 목록 조회 정렬 조건 쿼리를 구현한다.
- [x] 목록 조회 페이지네이션 쿼리를 구현한다.
- [x] 공개 채용 공고 상세 조회 쿼리를 구현한다.
- [x] `BookmarkRepository.java` 기본 조회 인터페이스를 작성한다.
- [x] 북마크 존재 여부 조회 쿼리를 구현한다.
- [x] 북마크 삭제 대상 조회 쿼리를 구현한다.

## Phase 3 - Service

- [x] `UserJobNoticeService.java` 인터페이스를 작성한다.
- [x] `JobNoticeDTO.ResponseList` DTO를 작성한다.
- [x] `JobNoticeDTO.ResponseDetail` DTO를 작성한다.
- [x] `JobNoticeDTO.ResponseBookmark` DTO를 작성한다.
- [x] 목록 조회 서비스 로직을 구현한다.
- [x] 상세 조회 서비스 로직을 구현한다.
- [x] 로그인 사용자 북마크 여부 계산 로직을 구현한다.
- [x] 북마크 등록 서비스 로직을 구현한다.
- [x] 북마크 해제 서비스 로직을 구현한다.
- [x] `JobNoticeErrorCode.java`를 작성한다.
- [x] JobNotice 도메인 예외 매핑 정책을 정리한다.

## Phase 4 - API

- [x] `GET /api/v1/user/job-notices` Controller 엔드포인트를 작성한다.
- [x] `GET /api/v1/user/job-notices/{jobNoticeId}` Controller 엔드포인트를 작성한다.
- [x] `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks` Controller 엔드포인트를 작성한다.
- [x] `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks` Controller 엔드포인트를 작성한다.
- [x] `ROLE_USER` 권한 정책과 Optional 인증 정책을 API 계층에 반영한다.

## Phase 5 - Documentation

- [ ] `UserJobNoticeControllerDocs.java` Swagger 인터페이스를 작성한다.
- [ ] 목록 조회 API의 요청/응답 문서를 정리한다.
- [ ] 상세 조회 API의 요청/응답 문서를 정리한다.
- [ ] 북마크 등록/해제 API의 요청/응답 문서를 정리한다.
- [ ] `api-schema.md`와 구현 대상 API 계약의 정합성을 점검한다.
- [ ] `spec.md`, `constitution.md`, `plan.md`와 구현 범위 정합성을 점검한다.

## Phase 6 - Test

- [x] 공개 채용 공고 목록 조회 테스트를 작성한다.
- [x] 공개 채용 공고 상세 조회 테스트를 작성한다.
- [x] 비로그인 조회 시 `bookmarked = false` 검증 테스트를 작성한다.
- [x] 로그인 조회 시 `bookmarked` 계산 테스트를 작성한다.
- [x] 북마크 등록 성공 테스트를 작성한다.
- [x] 북마크 해제 성공 테스트를 작성한다.
- [x] 중복 북마크 등록 예외 테스트를 작성한다.
- [x] 존재하지 않는 북마크 해제 예외 테스트를 작성한다.
- [x] QueryDSL 동적 검색 조건 테스트를 작성한다.
- [x] QueryDSL 정렬 조건 테스트를 작성한다.
- [x] 배열 컬럼(`skill_tags`, `job_category`) QueryDSL 조건 테스트의 실행 환경을 PostgreSQL 호환 기준(Testcontainers 등)으로 정리한다.
- [x] `ApiResponse<T>`와 1-based 페이지네이션 응답 형식 테스트를 작성한다.
- [x] 비공개 또는 존재하지 않는 공고 상세 조회 시 `JOB_NOTICE_NOT_FOUND` 예외 테스트를 작성한다.
- [x] 비공개 또는 존재하지 않는 공고 북마크 등록/해제 시 `JOB_NOTICE_NOT_FOUND` 예외 테스트를 작성한다.
