# Implementation Plan: auditLog

## Summary

> 관리자 감사 로그의 요약, 목록, 상세 조회 API를 권한 정책과 조회 전용 원칙에 맞춰 구현한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler` 기반 예외 처리
- 감사 로그 조회 조건 검증, 페이지네이션 변환, 권한 검증은 Service 인터페이스와 Impl 구현체에서 처리
- 외부 API 계약은 1-based 페이지네이션을 유지하고 내부 Pageable 변환 시 `page - 1` 적용
- FastAPI 연동 없음

## Project Structure

```text
admin/auditLog/
├── controller/   AuditLogController.java
├── service/      AuditLogService.java
│                 AuditLogServiceImpl.java
├── repository/   AuditLogRepository.java
├── entity/       AuditLog.java
├── dto/          AuditLogDTO.java
├── type/         AuditLogType.java
│                 AuditLogSeverity.java
├── exception/    AuditLogErrorCode.java
└── docs/         AuditLogDocs.java

global/
├── exception/    CustomException.java
│                 ErrorCode.java
│                 GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

## Phases

- [ ] Phase 1: Entity 정의 — `audit_logs` ERD와 enum 제약을 기준으로 감사 로그 엔티티와 타입 구조를 정리한다.
- [ ] Phase 2: Repository 구현 — 요약 집계, 목록 조회, 상세 조회, 조건 필터링에 필요한 조회 리포지토리를 구성한다.
- [ ] Phase 3: Service 구현 — 기간 검증, 검색 조건 검증, 권한 검증, 1-based 페이지 변환을 Service 인터페이스와 Impl에서 구현한다.
- [ ] Phase 4: API 구현 — Controller와 docs 인터페이스를 분리하고 `AuditLogDTO` 계약에 맞춰 감사 로그 조회 엔드포인트를 `ApiResponse`로 노출한다.
- [ ] Phase 5: 문서화 — Swagger docs, 공통/도메인 ErrorCode 분리, 요청 조건과 응답 계약이 실제 구현과 일치하도록 정리한다.
- [ ] Phase 6: 테스트 — 권한 분기, 기간/필터 검증, 1-based 페이지네이션, 요약/목록/상세 응답 구조를 검증한다.
