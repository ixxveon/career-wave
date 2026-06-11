# Implementation Plan: auditLog

## Summary

> 관리자 감사 로그의 요약, 목록, 상세 조회 API를 조회 전용 도메인 원칙과 권한 정책에 맞춰 구현한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler` 기반 예외 처리
- `page`, `size`, `keyword` 단일 필드 검증은 Request DTO(Bean Validation)에서 처리하고, `from > to` 같은 교차 필드 검증과 1-based 페이지 변환, ErrorCode 매핑은 Service 계층에서 처리
- `logType`, `severity`는 ERD CHECK 제약조건과 동일한 enum 값 집합을 사용
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

- [ ] Phase 1: Query - 감사 로그 요약 집계, 목록 필터링, 상세 조회에 필요한 조회 모델과 repository query를 구성한다.
- [ ] Phase 2: Service - 기간 교차 검증(`from > to`), enum 필터 검증, 권한 검증, 1-based 페이지 변환, ErrorCode 처리를 서비스 계층에 구현한다.
- [ ] Phase 3: API - Request DTO Bean Validation으로 `page`, `size`, `keyword` 단일 필드 검증을 처리하고 Controller와 docs 인터페이스를 분리한 뒤 `AuditLogDTO` 및 `ApiResponse<T>` 계약에 맞춰 조회 endpoint를 노출한다.
- [ ] Phase 4: Documentation - Swagger 문서와 스펙 문서가 실제 요청/응답, 권한, ErrorCode 계약과 일치하도록 정리한다.
- [ ] Phase 5: Test - 요약/목록/상세 조회, 권한 분기, DTO 검증, 필터 조건, 1-based 페이지네이션, 예외 응답을 검증한다.
