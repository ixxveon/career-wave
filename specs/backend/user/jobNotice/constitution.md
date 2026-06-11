# Constitution: jobNotice

**Feature Branch**: `docs/user-jobnotice-spec-refine`

## 1. 도메인 원칙

사용자 JobNotice 도메인은 공개 상태 채용 공고 조회와 사용자 개인 북마크 관계 관리만 책임진다.
관리자 운영 문맥, 스크래핑, AI 처리 흐름은 이 도메인에 포함하지 않는다.
사용자 응답 계약은 `ApiResponse<T>`와 확정된 Query Parameter 규격을 일관되게 유지한다.

## 2. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 사용자 문맥 한정 | JobNotice API와 문서는 `user` 패키지 및 사용자 문맥 범위에서만 유지한다. | 관리자 기능과 책임이 섞이면 권한 정책, 응답 계약, 유지보수 경계가 흐려지기 때문이다. |
| Optional 인증 조회 | 목록/상세 조회는 비로그인 접근을 허용하고 로그인 시에만 `bookmarked`를 개인화 계산한다. | 공개 공고 조회성과 개인화 응답 요구를 동시에 만족해야 하기 때문이다. |
| QueryDSL 기반 조회 | 목록 조회의 다중 검색 조건과 정렬은 QueryDSL 기반 동적 쿼리로 처리한다. | 조건 조합 수가 많고 배열 컬럼 검색까지 포함되어 정적 메서드 쿼리만으로는 유지보수가 어려워지기 때문이다. |
| 북마크 관계 분리 | 북마크는 `bookmarks` 테이블 기반 별도 관계로 관리한다. | 공고 본문 데이터와 사용자 관심 데이터를 분리해야 중복 제어와 사용자별 상태 계산이 단순해지기 때문이다. |
| 상태 기반 사용자 노출 | 사용자 조회 노출 여부는 `job_notices.notice_status` 기준으로 판단한다. | 운영 상태와 사용자 노출 결과가 불일치하면 잘못된 공고 노출이 발생하기 때문이다. |
| Spring Boot 단일 책임 | JobNotice 사용자 조회, 북마크 처리, 도메인 오류 반환은 Spring Boot가 전담한다. | `fastapi-schema.md`가 없고 본 도메인 요구사항이 Spring MVC/JPA/Security 책임 안에서 완결되기 때문이다. |
| 응답 규격 통일 | 모든 성공 응답은 `ApiResponse<T>` 래퍼와 확정된 페이지네이션 구조를 따른다. | React 프론트엔드가 일관된 응답 해석과 공통 예외 처리를 수행해야 하기 때문이다. |

## 3. 불변 규칙 (Invariants)

- 사용자 목록 및 상세 조회 대상 공고는 항상 `notice_status = ACTIVE` 상태여야 한다.
- 북마크는 `(member_id, job_notice_id)` 조합당 최대 1건만 존재해야 한다.
- 북마크 등록 및 해제는 인증된 `ROLE_USER` 요청으로만 수행되어야 한다.
- 비로그인 요청의 `bookmarked` 값은 항상 `false`여야 한다.
- 사용자에게 노출되지 않는 공고는 상세 조회와 북마크 처리에서 항상 `JOB_NOTICE_NOT_FOUND`로 취급되어야 한다.

## 4. 연동 계약

- **Spring ↔ DB**: Spring Boot만 `job_notices`, `bookmarks` 테이블에 대한 조회 및 변경 책임을 가진다. DB는 PK, FK, UNIQUE, CHECK 제약으로 최종 정합성을 보장한다.
- **Spring ↔ FastAPI**: 본 도메인은 FastAPI 비연동 도메인이다. Spring Boot가 FastAPI를 호출하지 않으며, FastAPI도 JobNotice 사용자 기능을 위해 DB에 직접 접근하지 않는다.
- **Spring ↔ 외부 시스템**: 외부 채용 플랫폼은 `original_url` 링크 제공 대상으로만 취급한다. Spring Boot는 외부 플랫폼 API 호출, 상태 동기화, 가용성 보장을 본 기능 책임에 포함하지 않는다.

## 5. 금지 패턴

- Swagger 어노테이션을 Controller에 직접 작성 금지 -> `docs/XxxDocs.java` 인터페이스로 분리.
- `admin` 문맥의 요구사항이나 API를 JobNotice 사용자 문서/구현 범위에 혼합 금지.
- Controller에서 Entity, `Map`, 임의 JSON 구조를 직접 반환하는 방식 금지.
- Controller에서 비즈니스 예외를 `try-catch`로 직접 처리하는 방식 금지.
- 북마크 중복 검증이나 `notice_status` 노출 정책을 Controller 또는 Repository 호출부에서 임의 판단하는 방식 금지.
- FastAPI 연동이 없음에도 JobNotice 사용자 기능을 FastAPI 호출 전제로 설계하는 방식 금지.
