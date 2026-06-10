# Implementation Plan: adminManagement

## Summary

> 관리자 계정과 IP ACL의 조회, 생성, 변경, 삭제 API를 권한 정책과 운영 안전장치에 맞춰 Spring Boot 관리자 백엔드에 구현한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler` 기반 예외 처리
- 관리자 계정과 IP ACL 변경 규칙은 Service 인터페이스와 `impl` 구현체에서 강제
- 외부 API는 1-based 페이지 계약을 사용하고 내부 Pageable 변환 시 `page - 1` 적용
- FastAPI 연동 없음

## Project Structure

```text
admin/adminManagement/
├── controller/   AdminManagementController.java
├── service/      AdminManagementService.java
├── service/impl/ AdminManagementServiceImpl.java
├── repository/   AdminRepository.java
├── repository/   IpAclRepository.java
├── repository/   AuditLogRepository.java
├── entity/       Admin.java
├── entity/       IpAcl.java
├── entity/       AuditLog.java
├── dto/          AdminManagementDTO.java
├── dto/          AdminAclDTO.java
├── type/         AdminRole.java
├── type/         AdminStatus.java
├── exception/    AdminManagementErrorCode.java
└── docs/         AdminManagementDocs.java

global/
├── exception/    CustomException.java
├── exception/    ErrorCode.java
├── exception/    GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

## Phases

- [ ] Phase 1: Entity - `admins`, `ip_acl`, `audit_logs` ERD와 Enum 제약조건 기준으로 엔티티와 타입 구조를 먼저 고정한다.
- [ ] Phase 2: Repository - 관리자 목록, ACL 목록, 중복 검증, 감사 추적 저장에 필요한 Repository 계약을 정의한다.
- [ ] Phase 3: Service - 권한 검증, 상태 전이, 중복 차단, 감사 추적 연계를 Service 인터페이스와 구현체에 반영한다.
- [ ] Phase 4: API - 관리자 계정 및 IP ACL endpoint를 `ApiResponse` 계약과 역할 정책에 맞춰 노출한다.
- [ ] Phase 5: Documentation - Swagger docs 인터페이스와 스펙 문서를 실제 API 계약 기준으로 정렬한다.
- [ ] Phase 6: Test - 권한 분기, 중복 오류, 상태 전이, 1-based 페이지네이션, 감사 추적 연계를 검증한다.
