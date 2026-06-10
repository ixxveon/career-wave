# Checklist: auditLog

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — 엔티티 & 레포지토리

- [ ] `AuditLog` 엔티티 필드가 `audit_logs` ERD 컬럼명, null 허용 여부와 일치하는가
- [ ] `AuditLogType`, `AuditLogSeverity` enum 값이 ERD CHECK 제약조건(`ADMIN_ACTIVITY`, `AI_METRICS_SYSTEM`, `SCRAPING_SYSTEM` / `INFO`, `WARN`, `ERROR`, `SUCCESS`)과 일치하는가
- [ ] JPA enum 필드가 `EnumType.STRING`으로 매핑되어 있는가
- [ ] `AuditLogRepository`에 요약 집계, 목록 조회, 상세 조회에 필요한 쿼리 메서드가 구현되어 있는가
- [ ] 목록 조회 쿼리가 `logType`, `severity`, `keyword`, `from`, `to`, 페이지네이션 조건을 반영하는가

## Phase 2 — 핵심 API (P1)

- [ ] `GET /api/v1/admin/audit-logs/summary`가 구현되어 있고 `MASTER`, `BACKEND` 권한으로만 접근 가능한가
- [ ] `GET /api/v1/admin/audit-logs`가 구현되어 있고 감사 로그 목록을 페이지네이션으로 반환하는가
- [ ] 요약 조회가 `logType`, `severity` 기준 집계 필드를 모두 반환하는가
- [ ] 목록 조회 정상 응답이 `ApiResponse<T>` 규격을 사용하는가
- [ ] 목록 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족하는가
- [ ] 유효하지 않은 기간 조건이 `INVALID_AUDIT_LOG_DATE_RANGE`로 처리되는가
- [ ] 유효하지 않은 검색 조건이 `INVALID_AUDIT_LOG_FILTER`로 처리되는가
- [ ] `keyword` 빈 문자열은 미입력과 동일하게 처리되고, 길이 제한 초과는 `INVALID_AUDIT_LOG_FILTER`로 처리되는가
- [ ] 유효하지 않은 페이지 요청이 `INVALID_PAGE_REQUEST`로 처리되는가

## Phase 3 — 부가 API (P2)

- [ ] `GET /api/v1/admin/audit-logs/{logId}`가 구현되어 있고 `MASTER`, `BACKEND` 권한으로만 접근 가능한가
- [ ] 상세 조회 정상 응답이 `ApiResponse<T>` 규격을 사용하는가
- [ ] 존재하지 않는 `logId` 요청이 `AUDIT_LOG_NOT_FOUND`로 처리되는가
- [ ] 감사 로그 도메인에 생성, 수정, 삭제 API가 추가되지 않았는가
- [ ] 조회 조건 검증과 페이지 번호 변환이 Controller나 Repository가 아니라 Service 레이어에만 존재하는가

## Phase 4 — 문서화 & 테스트

- [ ] `AuditLogDocs` 인터페이스가 작성되어 있고 Swagger 어노테이션이 Controller에서 분리되어 있는가
- [ ] Controller에 Swagger 어노테이션이 직접 작성되어 있지 않은가
- [ ] `api-schema.md`의 엔드포인트, 요청 조건, 응답 필드 명칭, 권한 정책이 실제 구현과 일치하는가
- [ ] 도메인 전용 ErrorCode가 `global.exception.ErrorCode`와 분리되어 관리되는가
- [ ] 공통 예외와 도메인 예외가 `GlobalExceptionHandler`를 통해 일관된 `ApiResponse` 실패 응답으로 변환되는가
- [ ] 요약/목록/상세 서비스 테스트가 작성되어 있고 주요 정상 케이스를 검증하는가
- [ ] 기간 검증, 필터 검증(`keyword` 길이 제한 포함), 미존재 로그, 권한 분기 테스트가 작성되어 있는가
- [ ] API 테스트에서 1-based page 입력이 내부 Pageable 변환 후 올바른 응답 구조로 반환되는가
- [ ] FastAPI 연동 코드, FastAPI 호출, FastAPI 의존 설정이 본 도메인 구현에 포함되어 있지 않은가

## 코드 품질

- [ ] `ApiResponse<T>` 래퍼를 사용하지 않는 감사 로그 엔드포인트가 없는가
- [ ] `CustomException` + `ErrorCode` 패턴을 사용하며 `new RuntimeException(...)` 직접 생성이 없는가
- [ ] 비즈니스 로직이 Service 인터페이스/Impl을 중심으로 구성되고 Controller는 요청 바인딩과 응답 반환에만 집중하는가
- [ ] Repository가 필터 검증 책임이나 권한 분기 책임까지 떠안고 있지 않은가

## 머지 전 최종 확인

- [ ] `spec.md`, `constitution.md`, `plan.md`, `tasks.md`의 요구사항과 실제 구현이 충돌하지 않는가
- [ ] constitution.md의 불변 규칙(읽기 전용 유지, 권한 제한, enum 제약, 1-based 페이지네이션)이 구현과 테스트에 반영되었는가
- [ ] tasks.md의 모든 작업 항목이 완료되었는가
