# Checklist: auditLog

> `tasks.md`가 "무엇을 만들지"라면, 이 체크리스트는 "제대로 만들었는지"를 검증한다.
> 구현 완료 후 PR 리뷰 전에 작성자 본인이 체크한다.

## Phase 1 - Query

- [x] `AuditLog` 엔티티 필드가 `audit_logs` ERD 컬럼명과 null 허용 여부에 일치하는가
- [x] `AuditLogType`, `AuditLogSeverity` enum 값이 ERD CHECK 제약조건(`ADMIN_ACTIVITY`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` / `INFO`, `WARN`, `ERROR`, `SUCCESS`)과 일치하는가
- [x] JPA enum 필드가 `EnumType.STRING`으로 매핑되어 있는가
- [x] `AuditLogQueryRepository`에 요약 집계, 목록 조회, 상세 조회에 필요한 쿼리 메서드가 구현되어 있는가
- [x] 목록 조회 쿼리가 `logType`, `severity`, `keyword`, `from`, `to`, `page`, `size` 조건을 반영하는가
- [x] Query Parameter와 ERD 컬럼 매핑이 문서 기준과 일치하는가

## Phase 2 - Service

- [ ] 감사 로그 요약 조회 서비스가 구현되어 있고 기간 조건을 올바르게 해석하는가
- [ ] 감사 로그 목록 조회 서비스가 구현되어 있고 필터 조건을 올바르게 해석하는가
- [ ] 감사 로그 상세 조회 서비스가 구현되어 있는가
- [ ] `from`, `to`, `page`, `size`가 유효하지 않은 요청을 공통 요청 검증 실패 `400`으로 처리하는가
- [ ] `from > to` 요청을 공통 요청 검증 실패 `400`으로 처리하는가
- [ ] `keyword` 공백-only 입력을 필터 미적용으로 처리하는가
- [ ] `keyword` 100자 초과 요청을 공통 요청 검증 실패 `400`으로 처리하는가
- [ ] 유효하지 않은 `logType` 요청을 `INVALID_AUDIT_LOG_TYPE`으로 처리하는가
- [ ] 유효하지 않은 `severity` 요청을 `INVALID_AUDIT_LOG_SEVERITY`로 처리하는가
- [ ] 존재하지 않는 `logId` 요청을 `AUDIT_LOG_NOT_FOUND`로 처리하는가
- [ ] 공통 `ErrorCode`와 도메인 `AuditLogErrorCode`가 분리되어 사용되는가
- [ ] 조회 조건 검증, 페이지 번호 변환, 권한 분기가 Controller나 Repository가 아닌 Service 계층에 위치하는가

## Phase 3 - API

- [ ] `GET /api/v1/admin/audit-logs/summary`가 구현되어 있고 `MASTER`, `BACKEND` 권한으로만 접근 가능한가
- [ ] `GET /api/v1/admin/audit-logs`가 구현되어 있고 감사 로그 목록을 페이지네이션으로 반환하는가
- [ ] `GET /api/v1/admin/audit-logs/{logId}`가 구현되어 있고 `MASTER`, `BACKEND` 권한으로만 접근 가능한가
- [ ] 요약 조회 응답이 전체 건수와 `logType`, `severity` 기준 집계 필드를 모두 포함하는가
- [ ] 목록 조회 정상 응답이 `ApiResponse<T>` 규격을 준수하는가
- [ ] 상세 조회 정상 응답이 `ApiResponse<T>` 규격을 준수하는가
- [ ] 목록 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족하는가
- [ ] 외부 API 기준 `page` 1-based 입력을 내부 Pageable 변환 시 `page - 1`로 정확히 처리하는가
- [ ] 감사 로그 조회 도메인에 생성, 수정, 삭제 API가 추가되어 있지 않은가

## Phase 4 - Documentation

- [ ] `AuditLogDocs` 인터페이스가 작성되어 있고 Swagger 어노테이션이 Controller에서 분리되어 있는가
- [ ] Controller에 Swagger 어노테이션이 직접 작성되어 있지 않은가
- [ ] `api-schema.md`의 요청 조건, 응답 필드, 권한 정책, ErrorCode 계약과 실제 구현이 일치하는가
- [ ] `spec.md`, `constitution.md`, `plan.md`, `tasks.md`의 구현 범위와 실제 구현이 충돌하지 않는가
- [ ] FastAPI 연동 코드, FastAPI 호출, FastAPI 의존 설정이 본 도메인 구현에 포함되어 있지 않은가

## Phase 5 - Test

- [ ] 요약/목록/상세 조회 테스트가 작성되어 있는가
- [ ] `logType`, `severity`, `keyword`, `from`, `to` 필터 테스트가 작성되어 있는가
- [ ] `keyword` 공백-only, `keyword` 100자 초과, `from > to` 검증 테스트가 작성되어 있는가
- [ ] 1-based page 입력과 내부 Pageable 변환 테스트가 작성되어 있는가
- [ ] 권한 허용/차단 테스트가 작성되어 있는가
- [ ] `AUDIT_LOG_NOT_FOUND`, `INVALID_AUDIT_LOG_TYPE`, `INVALID_AUDIT_LOG_SEVERITY` 예외 테스트가 작성되어 있는가
- [ ] 공통 요청 검증 실패 `400` 테스트가 작성되어 있는가

## 코드 일관성

- [ ] `ApiResponse<T>` 래퍼를 사용하지 않는 감사 로그 endpoint가 없는가
- [ ] `CustomException` + `ErrorCode` 패턴을 사용하고 `RuntimeException`을 직접 던지지 않는가
- [ ] 비즈니스 로직은 Service Layer에만 존재하고 Controller는 요청 바인딩과 응답 반환만 담당하는가
- [ ] Repository가 권한 정책, 응답 조립, ErrorCode 매핑 책임까지 가지지 않는가
- [ ] Entity를 API 응답으로 직접 노출하지 않는가

## 머지 전 최종 확인

- [ ] 권한(Role) 정책이 문서 기준(`MASTER`, `BACKEND`만 허용)과 실제 구현에서 일치하는가
- [ ] Audit Log 기록 여부 측면에서 본 도메인이 조회 전용 범위를 유지하고, 조회 요청 자체로는 감사 로그를 생성하지 않는가
- [ ] `constitution.md`의 분리 규칙(읽기 전용 유지, 권한 제한, enum 제약, 1-based 페이지네이션 등)이 구현과 테스트에 반영되었는가
- [ ] `tasks.md`의 모든 작업 항목이 완료되었는가
