# Checklist: JobNotice User Backend

> 구현 완료 후 검증 가능한 항목만 정리한다.
> 관련 문서: `spec.md` / `constitution.md` / `plan.md` / `tasks.md`

---

## 구현 범위 체크

- [ ] 구현 범위가 사용자 JobNotice 조회/북마크 기능으로 한정되어 있다.
- [ ] 관리자 기능 요구사항이나 관리자 API가 본 구현에 포함되지 않았다.

---

## 채용 공고 조회

- [ ] `GET /api/v1/user/job-notices`가 동작한다.
- [ ] `GET /api/v1/user/job-notices/{jobNoticeId}`가 동작한다.
- [ ] 목록과 상세 조회 모두 `notice_status = ACTIVE` 공고만 노출한다.
- [ ] 목록 조회에 확정된 Query Parameter가 반영된다.
- [ ] 응답 페이지 정보가 1-based 기준으로 반환된다.
- [ ] 비로그인 사용자도 목록/상세 조회가 가능하다.
- [ ] 존재하지 않는 공고 또는 비공개 공고 요청 시 정의된 `ErrorCode`로 실패 응답을 반환한다.

---

## 북마크

- [ ] 북마크 등록 API가 `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks` 경로를 사용한다.
- [ ] 북마크 해제 API가 `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks` 경로를 사용한다.
- [ ] 북마크 등록/해제는 `ROLE_USER` 권한에서만 허용된다.
- [ ] `(member_id, job_notice_id)` 조합 중복 생성이 차단된다.
- [ ] 없는 북마크 해제 요청 시 정의된 `ErrorCode`를 반환한다.
- [ ] 비로그인 요청에서 북마크 API는 인증 오류를 반환한다.
- [ ] 로그인 목록/상세 조회에서 `bookmarked` 값이 사용자 기준으로 계산된다.
- [ ] 비로그인 목록/상세 조회에서 `bookmarked` 값이 `false`로 고정된다.

---

## ApiResponse / ErrorCode

- [ ] 모든 응답이 `ApiResponse<T>` 래퍼 형식을 따른다.
- [ ] 페이지 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 따른다.
- [ ] 비즈니스 예외가 모두 `CustomException(ErrorCode)`로 처리된다.
- [ ] `new RuntimeException(...)` 직접 생성 코드가 없다.
- [ ] 공통 오류 코드는 `global.exception.ErrorCode`에서 관리된다.
- [ ] JobNotice 전용 오류 코드는 도메인 `exception` 패키지에서 분리 관리된다.
- [ ] 공통 코드와 도메인 코드의 명칭 충돌 없이 예외 매핑이 구성되어 있다.
- [ ] 최소한 다음 JobNotice 도메인 오류 코드가 구현 및 문서에 반영되어 있다:
- [ ] `INVALID_JOB_NOTICE_FILTER`
- [ ] `INVALID_PAGE_REQUEST`
- [ ] `JOB_NOTICE_NOT_FOUND`
- [ ] `JOB_NOTICE_CLOSED`
- [ ] `BOOKMARK_ALREADY_EXISTS`
- [ ] `BOOKMARK_NOT_FOUND`

---

## Swagger Docs

- [ ] Swagger 어노테이션이 Controller가 아니라 `docs` 인터페이스에 분리되어 있다.
- [ ] `UserJobNoticeControllerDocs`가 존재한다.
- [ ] Swagger 요청/응답 예시가 실제 API 계약과 일치한다.
- [ ] Swagger 문서에 주요 `ErrorCode` 응답이 반영되어 있다.

---

## Service Layer

- [ ] 비즈니스 로직이 Controller가 아니라 Service Layer에 있다.
- [ ] Service가 인터페이스와 `impl` 구현체로 분리되어 있다.
- [ ] 공개 상태 필터링 정책이 Service Layer 기준으로 적용된다.
- [ ] 북마크 등록/해제 로직이 Service Layer의 트랜잭션 안에서 처리된다.
- [ ] Controller는 인증 정보 추출, 요청 매핑, Service 호출, 응답 반환 역할만 수행한다.

---

## FastAPI 연동

- [ ] JobNotice 사용자 기능 구현에 FastAPI 연동 코드가 없다.
- [ ] 문서상 FastAPI 비적용 범위가 명시되어 있다.

---

## 최종 확인

- [ ] `spec.md`의 Acceptance Scenario와 구현 결과가 충돌하지 않는다.
- [ ] `constitution.md`의 불변 규칙이 구현과 테스트에서 지켜진다.
- [ ] `plan.md`와 `tasks.md`의 범위가 실제 구현 범위와 일치한다.
