# Constitution: JobNotice User Backend

**Feature Branch**: `feature/job-notice-backend-spec`
**Scope**: 사용자 채용 공고 목록 조회, 상세 조회, 북마크 등록, 북마크 해제
**Version**: v1

---

## 1. 도메인 원칙

사용자에게 노출되는 채용 공고는 공개 상태 공고로 제한한다.
북마크는 사용자 개인의 관심 관계이며 공고 본문 데이터와 분리해 관리한다.
사용자 API 계약은 `ApiResponse<T>`와 확정된 Query Parameter 규격을 일관되게 유지한다.

---

## 2. 상태 머신

### 채용 공고 (`job_notices.notice_status`)

```text
ACTIVE
  -> CLOSED

CLOSED
  -> ACTIVE
```

| 전이 | 허용 여부 | 처리 의미 |
|---|---|---|
| ACTIVE -> CLOSED | 허용 | 사용자 목록/상세 노출 중단 |
| CLOSED -> ACTIVE | 허용 | 사용자 목록/상세 노출 재개 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 이유 |
|---|---|---|
| 사용자 패키지 한정 | JobNotice API는 `user` 패키지 범위에서만 정의한다 | 현재 문서 목표가 사용자 채용 공고 기능 구현이며 관리자 문맥이 섞이면 책임 경계가 흐려지기 때문이다 |
| `ApiResponse<T>` 공통 응답 | 모든 성공/실패 응답을 공통 래퍼로 반환한다 | 프론트엔드가 일관된 응답 해석과 공통 예외 처리를 할 수 있어야 하기 때문이다 |
| Service 인터페이스 분리 | Service는 인터페이스와 `impl` 구현체로 분리한다 | 서비스 계약과 구현 책임을 나누어 테스트, 확장, 의존 방향을 명확히 유지하기 위해서다 |
| Optional 인증 조회 | 목록/상세 조회는 비로그인 접근을 허용하되 로그인 시에만 개인화된 `bookmarked` 값을 계산한다 | 공개 공고 노출과 개인화 정보를 동시에 만족해야 하기 때문이다 |
| 북마크 관계 분리 | 북마크는 `Bookmark` 별도 엔티티로 관리한다 | 공고 데이터와 사용자 관심 데이터를 분리해야 중복 방지와 사용자별 상태 계산이 명확해지기 때문이다 |
| 상태 기반 노출 | 사용자 조회는 `job_notices.notice_status`를 기준으로 노출 여부를 판단한다 | 공고 운영 상태와 사용자 노출 결과가 항상 일치해야 하기 때문이다 |
| ErrorCode 계층 분리 | 공통 오류 코드는 `global.exception.ErrorCode`, 도메인 전용 오류 코드는 `user.jobNotice.exception` 하위에서 분리 관리한다 | 공통 코드와 도메인 코드를 분리해야 이름 충돌과 책임 혼합을 줄일 수 있기 때문이다 |

---

## 4. 불변 규칙

- 사용자 목록 및 상세 조회 대상 공고는 반드시 `notice_status = ACTIVE` 상태여야 한다.
- 북마크는 `(member_id, job_notice_id)` 조합당 최대 1건만 존재해야 한다.
- 북마크 등록 및 해제는 인증된 `ROLE_USER` 본인 요청으로만 수행되어야 한다.
- 비로그인 요청의 `bookmarked` 값은 항상 `false`여야 한다.

---

## 5. 연동 계약

### Spring <-> React

- Spring Boot는 `/api/v1/user/job-notices` 하위 API의 유일한 계약 제공자다.
- React 프론트엔드는 1-based `page` Query Parameter 규격과 `ApiResponse<T>` 응답 구조를 그대로 사용한다.
- Optional 인증 API에서 로그인 여부에 따른 `bookmarked` 차이는 Spring이 계산해 응답한다.

### Spring <-> DB

- Spring Boot는 PostgreSQL의 `job_notices`, `bookmarks` 테이블에 대한 유일한 쓰기/읽기 주체다.
- 조회 조건, 상태 필터, 북마크 중복 검증은 Service 인터페이스와 구현체 계층을 통해 수행한다.
- ERD의 PK, FK, UNIQUE, CHECK 제약은 DB가 최종 보장하고 애플리케이션은 사전 검증을 보조한다.

### Spring <-> FastAPI

- JobNotice 사용자 기능 범위에서는 Spring과 FastAPI 간 연동 책임이 없다.
- FastAPI 관련 로직, 네트워크 호출, 비동기 처리 상태 반영은 본 도메인 범위 밖이다.

### Spring <-> 외부 시스템

- 채용 공고 원문 URL은 응답 데이터로만 제공되며 외부 채용 플랫폼 호출 책임은 없다.
- 외부 시스템 장애는 JobNotice 사용자 API의 핵심 동작 조건이 아니다.

---

## 6. 금지 패턴

- `admin` 문맥의 요구사항이나 API를 JobNotice 사용자 문서와 구현 범위에 섞는 것을 금지한다.
- Controller에서 Entity, `Map`, 임의 JSON 구조를 직접 반환하는 것을 금지한다.
- Controller에서 비즈니스 예외를 `try-catch`로 직접 처리하는 것을 금지한다.
- `new RuntimeException(...)` 직접 생성 대신 `CustomException(ErrorCode)`를 사용해야 한다.
- JobNotice 전용 오류 코드를 전부 `global.exception.ErrorCode`에 혼합하는 것을 금지한다.
- `EnumType.ORDINAL` 사용을 금지하고 Enum은 문자열 기반으로 유지해야 한다.
- Service 계층 밖에서 `notice_status` 노출 정책이나 북마크 중복 정책을 직접 판단하는 것을 금지한다.
