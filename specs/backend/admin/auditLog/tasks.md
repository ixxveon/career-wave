# Tasks: auditLog

> `plan.md`의 Phase와 1:1 대응한다.
> 각 작업은 1~3시간 내 완료 가능한 단일 책임 단위로 분해한다.

## Phase 1 - Query

- [ ] `AuditLogType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [ ] `AuditLogSeverity.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [ ] `AuditLog.java` 엔티티를 `audit_logs` ERD 컬럼 기준으로 작성한다.
- [ ] `AuditLogRepository.java` 기본 조회 인터페이스를 작성한다.
- [ ] 감사 로그 요약 집계를 위한 조회 쿼리를 작성한다.
- [ ] 감사 로그 목록 `logType` 필터 조회 조건을 구현한다.
- [ ] 감사 로그 목록 `severity` 필터 조회 조건을 구현한다.
- [ ] 감사 로그 목록 `keyword` 필터 조회 조건을 구현한다.
- [ ] `keyword` 공백-only 입력을 필터 미적용으로 해석하는 규칙을 구현한다.
- [ ] 감사 로그 목록 `from`, `to` 기간 필터 조회 조건을 구현한다.
- [ ] 감사 로그 목록 페이지네이션 조회 조건을 정리한다.
- [ ] 감사 로그 상세 단건 조회 메서드를 작성한다.

## Phase 2 - Service

- [ ] `AuditLogService.java` 인터페이스를 작성한다.
- [ ] 감사 로그 요약 조회 서비스 로직을 구현한다.
- [ ] 감사 로그 목록 조회 서비스 로직을 구현한다.
- [ ] 감사 로그 상세 조회 서비스 로직을 구현한다.
- [ ] `from`, `to` 기간 조건 공통 검증 로직을 구현한다.
- [ ] `from > to` 요청을 공통 요청 검증 실패 `400`으로 처리하는 로직을 구현한다.
- [ ] `logType` 값 검증과 `INVALID_AUDIT_LOG_TYPE` 매핑을 구현한다.
- [ ] `severity` 값 검증과 `INVALID_AUDIT_LOG_SEVERITY` 매핑을 구현한다.
- [ ] 1-based `page`를 내부 Pageable로 변환하는 로직을 구현한다.
- [ ] 상세 미존재 조회에 대한 `AUDIT_LOG_NOT_FOUND` 예외 처리를 구현한다.
- [ ] `AuditLogErrorCode.java` 도메인 오류 코드를 작성한다.

## Phase 3 - API

- [ ] `AuditLogDTO.java`를 작성한다.
- [ ] 목록 조회 Request DTO에 `page >= 1`, `size >= 1` Bean Validation을 적용한다.
- [ ] 목록 조회 Request DTO에 `keyword` 최대 100자 Bean Validation을 적용한다.
- [ ] `from > to` 교차 필드 검증은 Service 계층에서 처리하고 DTO 단순 필드 검증과 분리한다.
- [ ] `GET /api/v1/admin/audit-logs/summary` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/audit-logs` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/audit-logs/{logId}` Controller endpoint를 작성한다.
- [ ] `AuditLogController.java`의 응답을 `ApiResponse<T>` 기준으로 정리한다.
- [ ] `AuditLogDocs.java` Swagger 인터페이스를 작성한다.
- [ ] JWT 인증과 `MASTER`, `BACKEND` 역할 접근 제어를 API 계층에 반영한다.

## Phase 4 - Documentation

- [ ] `api-schema.md`와 요청/응답 계약 필드 정합성을 점검한다.
- [ ] `spec.md`와 구현 범위 정합성을 점검한다.
- [ ] `constitution.md`와 권한/책임 경계 정합성을 점검한다.
- [ ] 감사 로그 API의 도메인 ErrorCode 문서를 정리한다.
- [ ] Swagger 문서가 `docs` 인터페이스 기준으로 분리되어 노출되는지 점검한다.

## Phase 5 - Test

- [ ] 감사 로그 요약 조회 테스트를 작성한다.
- [ ] 감사 로그 목록 조회 테스트를 작성한다.
- [ ] 감사 로그 상세 조회 테스트를 작성한다.
- [ ] `logType` 필터 테스트를 작성한다.
- [ ] `severity` 필터 테스트를 작성한다.
- [ ] `keyword` 필터 테스트를 작성한다.
- [ ] `keyword` 공백-only 입력 시 필터 미적용 테스트를 작성한다.
- [ ] `keyword` 100자 초과 요청의 공통 검증 실패 테스트를 작성한다.
- [ ] `from`, `to` 기간 필터 테스트를 작성한다.
- [ ] `from > to` 요청의 공통 검증 실패 테스트를 작성한다.
- [ ] 1-based 페이지네이션 변환 테스트를 작성한다.
- [ ] `AUDIT_LOG_NOT_FOUND` 예외 테스트를 작성한다.
- [ ] `INVALID_AUDIT_LOG_TYPE` 예외 테스트를 작성한다.
- [ ] `INVALID_AUDIT_LOG_SEVERITY` 예외 테스트를 작성한다.
- [ ] `MASTER`, `BACKEND` 권한 허용 테스트를 작성한다.
- [ ] 그 외 권한 차단 테스트를 작성한다.
- [ ] `ApiResponse<T>` 응답 구조 테스트를 작성한다.
