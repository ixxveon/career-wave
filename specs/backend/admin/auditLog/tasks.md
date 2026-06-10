# Tasks: auditLog

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - Entity 정의

- [ ] `AuditLogType.java`, `AuditLogSeverity.java` 정의 — ERD의 CHECK 제약조건과 동일한 enum 값 반영
- [ ] `AuditLog.java` 작성 — `audit_logs` 테이블 매핑, `logType`/`severity`를 `EnumType.STRING`으로 관리
- [ ] 감사 로그 엔티티 필드 정리 — `auditLogId`, `adminId`, `action`, `targetType`, `targetId`, `ipAddress`, `detail`, `createdAt` 컬럼 매핑 반영

## Phase 2 - Repository 구현

- [ ] `AuditLogRepository.java` 작성 — 감사 로그 목록 조회와 단건 상세 조회 메서드 구성
- [ ] 감사 로그 요약 집계 쿼리 구현 — `logType`, `severity` 기준 집계 조회 구성
- [ ] 감사 로그 목록 필터링 쿼리 구현 — `logType`, `severity`, `keyword`, `from`, `to`, 페이지네이션 조건 반영

## Phase 3 - Service 구현

- [ ] `AuditLogService.java` 인터페이스 작성 — 요약, 목록, 상세 조회 메서드 계약 정의
- [ ] `AuditLogServiceImpl.java`에 요약 조회 구현 — 기간 조건 검증과 집계 응답 구성 반영
- [ ] `AuditLogServiceImpl.java`에 목록 조회 구현 — 검색 조건 검증(`keyword` 빈 문자열 미입력 처리, 길이 제한 검증 포함)과 1-based 페이지 변환 반영
- [ ] `AuditLogServiceImpl.java`에 상세 조회 구현 — `AUDIT_LOG_NOT_FOUND` 예외 처리 반영
- [ ] `AuditLogErrorCode.java` 작성 및 도메인 전용 ErrorCode 설계 — 공통 `global.exception.ErrorCode`와 분리하여 Service 예외 매핑 정리
- [ ] 감사 로그 조회 권한 검증 로직 정리 — `MASTER`, `BACKEND` 접근 범위 반영

## Phase 4 - API 구현

- [ ] `AuditLogDTO.java` 작성 — 요약, 목록, 상세 응답 및 조회 조건 계약 정의
- [ ] `AuditLogController.java` 작성 — 감사 로그 요약/목록/상세 엔드포인트와 `ApiResponse` 반환 구조 구현
- [ ] `AuditLogDocs.java` 작성 — Swagger 어노테이션을 Controller에서 분리
- [ ] JWT 기반 인증/인가 및 `MASTER`/`BACKEND` 역할 접근 제어를 API 진입점에 연결

## Phase 5 - 문서화

- [ ] `api-schema.md`와 실제 요청 조건/응답 DTO 필드 명칭 일치 여부 점검
- [ ] 감사 로그 API의 ErrorCode 목록과 실패 조건 문서 정리
- [ ] Swagger 문서가 docs 인터페이스 기준으로 분리되어 노출되는지 점검
- [ ] `ApiResponse` 래퍼와 페이지네이션 응답 형식(`content`, `page`, `size`, `totalElements`, `totalPages`) 문서 일치 여부 정리

## Phase 6 - 테스트

- [ ] 감사 로그 요약 조회 서비스 테스트 작성 — 기간 조건과 집계 응답 검증
- [ ] 감사 로그 목록 조회 서비스 테스트 작성 — 필터 조건과 1-based 페이지 변환 검증
- [ ] 감사 로그 상세 조회 서비스 테스트 작성 — `AUDIT_LOG_NOT_FOUND` 예외 처리 검증
- [ ] 권한 분기 테스트 작성 — `MASTER`, `BACKEND` 허용 및 그 외 권한 거부 검증
- [ ] Controller/API 테스트 작성 — `ApiResponse` 구조와 요약/목록/상세 응답 계약 검증
