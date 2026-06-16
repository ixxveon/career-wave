# Constitution: auditLog

**Feature Branch**: `docs/admin-audit-log-spec`

## 1. 도메인 원칙

- `auditLog`는 관리자 운영 이력 조회 전용 도메인이다.
- `auditLog`는 감사 로그 생성, 수정, 삭제 책임을 갖지 않는다.
- `auditLog`는 관리자 백엔드 범위에서만 동작하며 사용자 도메인 책임을 포함하지 않는다.

## 2. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 조회 전용 도메인 유지 | `auditLog`는 `GET /summary`, `GET /`, `GET /{logId}`만 제공한다. | 감사 로그 조회와 로그 적재 책임을 분리해야 운영 추적 기능의 경계가 명확해진다. |
| Service 인터페이스/구현 분리 | 감사 로그 조회 유스케이스는 `AuditLogService`와 `AuditLogServiceImpl`로 분리한다. | 조회 조건 해석, 1-based 페이지 변환, 예외 매핑 책임을 서비스 계층에 모을 수 있다. |
| ApiResponse 공통 규격 적용 | 모든 감사 로그 응답은 `ApiResponse<T>`로 반환한다. | 관리자 프론트엔드가 공통 응답 구조를 일관되게 처리할 수 있다. |
| 1-based 페이지 계약 유지 | 외부 API는 1-based `page`를 유지하고 내부 Pageable 변환에서만 `page - 1`을 적용한다. | 프론트엔드 계약과 Spring Data 내부 규칙을 함께 만족한다. |
| ERD CHECK 제약 기준 enum 해석 | `logType`, `severity`는 ERD CHECK 제약과 동일한 값 집합으로 해석한다. | DB 제약과 API 계약의 정합성을 유지한다. |
| Swagger 문서 분리 | Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다. | 구현과 문서 책임을 분리해 Controller를 단순하게 유지한다. |
| 관리자 권한 경계 고정 | 감사 로그 조회 API는 관리자 인증(`ROLE_ADMIN`)을 통과한 사용자 중 세부 역할이 `MASTER` 또는 `BACKEND`인 경우만 접근 가능하도록 설계한다. | 운영 로그는 민감한 관리자 행위 이력을 포함하므로 최소 권한 원칙을 적용해야 한다. |

## 3. 불변 규칙

- 감사 로그 API는 항상 조회 전용이어야 하며 생성, 수정, 삭제 유스케이스를 추가하지 않는다.
- 감사 로그 조회 권한은 항상 관리자 인증(`ROLE_ADMIN`) + 세부 역할 `MASTER` 또는 `BACKEND` 조건으로 제한되어야 한다.
- `audit_logs.log_type` 값은 항상 `ADMIN_ACTIVITY`, `ADMIN_MANAGEMENT`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` 중 하나여야 한다.
- `audit_logs.severity` 값은 항상 `INFO`, `WARN`, `ERROR`, `SUCCESS` 중 하나여야 한다.
- 감사 로그 목록 응답은 항상 `ApiResponse<T>`와 1-based 페이지네이션 구조를 유지해야 한다.
- 감사 로그 상세 조회에서 대상 로그가 존재하지 않으면 반드시 `AUDIT_LOG_NOT_FOUND`를 반환해야 한다.

## 4. 연동 계약

- **Spring Boot ↔ FastAPI**: 본 도메인은 FastAPI 연동 대상이 아니며 호출 방향이 존재하지 않는다. 감사 로그 조회 API는 Spring Boot가 단독으로 처리한다.
- **Spring Boot ↔ DB**: Spring Boot는 `audit_logs` 테이블 조회 책임을 가진다. 필터 조건 해석, 기간 조건 적용, 페이지 변환, ErrorCode 매핑도 Spring Boot가 수행한다.
- **DB 직접 접근 가능 주체**: 본 도메인 범위에서 `audit_logs` 조회를 위한 애플리케이션 접근 주체는 Spring Boot 백엔드뿐이다.
- **Spring Boot ↔ Security**: 문서상 권한 `MASTER`, `BACKEND`, `CS`는 Spring Security에서 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑되며, 감사 로그 API에는 관리자 인증(`ROLE_ADMIN`)과 함께 `ROLE_MASTER` 또는 `ROLE_BACKEND`만 허용한다.
- **Spring Boot ↔ 프론트 시스템**: 외부 연동 주체는 JWT 인증 체계를 사용하는 관리자 프론트엔드다. 별도의 로그 수집 시스템이나 분석 파이프라인 호출은 본 도메인 조회 계약 범위에 포함하지 않는다.

## 5. 금지 사항

- Swagger 어노테이션을 Controller에 직접 작성하지 않는다. `docs/AuditLogDocs.java`로 분리해야 한다.
- 감사 로그 조회 도메인에 생성, 수정, 삭제 API를 추가하지 않는다.
- Controller에서 조회 조건 검증, 페이지 번호 변환, 권한 분기 같은 비즈니스 로직을 직접 처리하지 않는다.
- Repository에서 권한 정책이나 API 응답 조립 책임까지 처리하지 않는다.
- Entity를 API 응답으로 직접 노출하지 않는다.
