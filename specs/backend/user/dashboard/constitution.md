# Constitution: 사용자 대시보드

**Feature Branch**: `feature/user-dashboard-backend-docs`

---

## 1. 도메인 원칙

> Dashboard는 로그인한 사용자의 계정 정보와 스크랩 공고를 조회·관리하는 API를 제공한다.
> Dashboard는 채용공고 자체를 관리하지 않으며, 채용공고 상세 정보의 소유권은 JobNotice 도메인에 있다.

* Dashboard는 로그인 사용자 기준의 내 정보 조회 기능을 제공한다.
* Dashboard는 GitHub 연동 상태 조회 기능을 제공한다.
* Dashboard는 회원 정보 수정 기능을 제공한다.
* Dashboard는 스크랩 공고 조회 및 스크랩 취소 기능을 제공한다.
* Dashboard는 채용공고 상세 데이터를 직접 제공하지 않는다.

---

## 2. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정                 | 내용                                          | 근거                                |
| ------------------ | ------------------------------------------- | --------------------------------- |
| ApiResponse 사용     | 모든 API 응답을 ApiResponse<T> 형식으로 통일           | 프로젝트 전역 응답 규칙 준수                  |
| DTO 단일 파일 관리       | DashboardDTO.java 내부 Request/Response 구조 사용 | Convention의 DTO Inner Class 규칙 준수 |
| JWT 인증 기반 처리       | 로그인 사용자 기준 데이터 조회                           | 타인 데이터 접근 방지                      |
| Domain 분리 유지       | Dashboard는 JobNotice 상세 구현을 직접 수행하지 않음      | 도메인 책임 분리                         |
| ErrorCode 기반 예외 처리 | CustomException + ErrorCode 사용              | 예외 처리 일관성 확보                      |
| Swagger 문서 분리      | DashboardControllerDocs 인터페이스 사용            | API 문서와 비즈니스 로직 분리                |

---

## 3. 불변 규칙 (Invariants)

> 항상 참이어야 하는 조건

* 모든 API는 `ApiResponse<T>` 형식으로 응답해야 한다.
* 모든 API는 로그인 사용자 기준으로 동작해야 한다.
* 본인 소유 데이터만 조회 및 수정할 수 있어야 한다.
* 스크랩 취소는 본인 소유 스크랩에 대해서만 가능해야 한다.
* 삭제된 채용공고는 스크랩 목록에 유지되어야 한다.
* 삭제된 채용공고는 `deleted=true` 상태로 반환되어야 한다.
* Entity를 API 응답으로 직접 반환해서는 안 된다.
* 예상 가능한 예외는 반드시 ErrorCode를 통해 관리해야 한다.
* Controller 내부에서 반복적인 try-catch를 작성하지 않는다.

---

## 4. 연동 계약

> 다른 도메인 또는 외부 시스템과의 경계를 명시한다.

* 회원 정보는 `members` 테이블 데이터를 사용한다.
* 프로필 정보는 `personal_profiles` 테이블 데이터를 사용한다.
* 스크랩 공고 정보는 `bookmarks` 및 `job_notices` 데이터를 사용한다.
* 채용공고 상세 정보는 JobNotice 도메인 정책을 따른다.
* 인증 사용자 정보는 Security Context 또는 공통 인증 유틸을 통해 조회한다.
* Dashboard는 FastAPI와 직접 통신하지 않는다.
* Dashboard는 Admin 도메인을 직접 참조하지 않는다.

---

## 5. 금지 패턴

> 실수하기 쉬운 안티패턴

* Entity를 API 응답으로 직접 반환하는 것 금지
* Controller에서 Map을 직접 반환하는 것 금지
* RuntimeException 직접 생성 금지
* Controller 내부 반복 try-catch 작성 금지
* Admin 도메인 직접 참조 금지
* JobNotice 상세 데이터를 Dashboard 내부에서 직접 구현하는 것 금지
* 타인 회원의 Dashboard 데이터 접근 허용 금지
* 삭제된 채용공고를 스크랩 목록에서 제거하는 처리 금지
* ApiResponse 형식을 벗어난 응답 반환 금지
* ErrorCode 없이 비즈니스 예외를 처리하는 것 금지
