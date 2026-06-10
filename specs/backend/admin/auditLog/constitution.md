# Constitution: auditLog

**Feature Branch**: `feature/admin-audit-log-spec`

## 1. 도메인 원칙

- 어드민 감사 로그는 운영 변경 이력을 조회하고 추적하는 읽기 전용 도메인만 담당한다.
- 감사 로그는 생성·수정·삭제를 제공하지 않으며, 조회 조건과 권한 검증만 책임진다.
- 사용자 기능, 통계 화면, FastAPI 위임은 이 도메인의 책임이 아니다.

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 읽기 전용 도메인 유지 | `auditLog`는 `GET /summary`, `GET /`, `GET /{logId}`만 제공한다. | 감사 로그 도메인의 책임은 운영 이력 조회이며, 쓰기 기능을 포함하면 로그 적재 책임과 조회 책임이 혼합된다. |
| Service 인터페이스 분리 | 감사 로그 조회 유스케이스는 Service 인터페이스와 Impl 구현체로 분리한다. | 조회 조건 검증, 권한 검증, 페이지네이션 변환 규칙을 구현체에 집중시켜 테스트와 책임 분리가 쉬워진다. |
| ApiResponse 일관 적용 | 모든 성공/실패 응답은 `ApiResponse` 규격으로 반환한다. | 관리자 프론트엔드와의 계약을 단순화하고 공통 예외 처리기와 결합해 일관된 조회 응답을 보장할 수 있다. |
| 1-based 페이지 계약 유지 | 외부 API는 1-based page를 유지하고 내부 Pageable 변환 시 `page - 1`을 적용한다. | 프론트엔드 계약을 깨지 않으면서 Spring Data 기본 규약과 자연스럽게 연결할 수 있다. |
| ERD 기반 enum 고정 | `logType`, `severity` 값은 `audit_logs`의 CHECK 제약조건과 동일하게 유지한다. | 감사 로그 필터와 집계 기준이 DB 제약과 다르면 조회 조건과 통계 결과가 불일치할 수 있다. |
| Swagger 문서 분리 | Swagger 어노테이션은 Controller가 아니라 docs 인터페이스에 작성한다. | 팀 컨벤션을 지키고 Controller를 HTTP 바인딩 책임에만 집중시키기 위함이다. |
| admin 패키지 경계 유지 | 감사 로그 기능은 `admin` 패키지 범위에서만 구현한다. | 관리자 운영 도메인이 사용자 도메인과 직접 결합되면 권한 경계와 변경 영향 범위가 흐려진다. |

## 4. 불변 규칙 (Invariants)

- 감사 로그 API는 항상 읽기 전용이어야 하며 생성, 수정, 삭제 엔드포인트를 추가할 수 없다.
- 감사 로그 조회 권한은 항상 `MASTER` 또는 `BACKEND`로 제한되어야 한다.
- 감사 로그의 `logType` 값은 항상 `ADMIN_ACTIVITY`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` 중 하나여야 한다.
- 감사 로그의 `severity` 값은 항상 `INFO`, `WARN`, `ERROR`, `SUCCESS` 중 하나여야 한다.
- 감사 로그 목록 응답은 항상 `ApiResponse<T>`와 1-based 페이지네이션 구조를 유지해야 한다.
- 조회 조건 검증과 페이지 번호 변환은 반드시 Service 레이어를 통해 처리되어야 한다.

## 5. 연동 계약

- **Spring ↔ FastAPI**: 본 도메인은 FastAPI와 연동하지 않는다. 감사 로그 조회 API는 Spring Boot 백엔드가 단독으로 책임진다.
- **Spring ↔ DB**: Spring Boot는 `audit_logs` 테이블의 조회 책임을 가진다. 필터링, 기간 검증, 페이지네이션 변환은 애플리케이션 계층에서 수행하고 DB는 제약조건과 조회 결과를 보장한다.
- **Spring ↔ 외부 시스템**: 외부 감사 플랫폼, 외부 로그 수집기, 외부 모니터링 시스템과의 직접 연동은 현재 범위에 포함하지 않는다. 본 도메인은 내부 DB에 적재된 감사 로그만 조회한다.
- **Spring ↔ Security**: 문서상 권한 `MASTER`, `BACKEND`, `CS`는 Spring Security에서 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑되며, 실제 감사 로그 조회 API 접근은 `MASTER`, `BACKEND`만 허용한다.

## 6. 금지 패턴

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/XxxDocs.java` 인터페이스로 분리.
- 감사 로그 조회 도메인에 생성, 수정, 삭제 API를 추가하는 것 금지.
- Controller에서 조회 조건 검증, 페이지 번호 변환, 권한 분기 같은 비즈니스 로직을 직접 처리하는 것 금지.
- Repository에서 필터 검증 책임까지 떠안는 것 금지.
- Entity를 API 응답으로 직접 반환하는 것 금지.
