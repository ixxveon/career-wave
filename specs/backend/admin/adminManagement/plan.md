# Implementation Plan: adminManagement

## Summary

> 관리자 계정과 IP ACL의 조회, 생성, 변경, 삭제 API를 권한 정책과 운영 불변 규칙에 맞춰 구현한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler` 기반 예외 처리
- 관리자 계정과 IP ACL 변경은 Service 인터페이스와 Impl 구현체에서 비즈니스 규칙을 강제
- 외부 API 계약은 1-based 페이지네이션을 유지하고 내부 Pageable 변환 시 `page - 1` 적용
- FastAPI 연동 없음

## Project Structure

```text
admin/adminManagement/
├── controller/   AdminManagementController.java
├── service/      AdminManagementService.java
│                 AdminManagementServiceImpl.java
├── repository/   AdminRepository.java
│                 IpAclRepository.java
│                 AuditLogRepository.java
├── entity/       Admin.java
│                 IpAcl.java
│                 AuditLog.java
├── dto/          AdminManagementDTO.java
│                 AdminAclDTO.java
├── type/         AdminRole.java
│                 AdminStatus.java
├── exception/    AdminManagementErrorCode.java
└── docs/         AdminManagementDocs.java

global/
├── exception/    CustomException.java
│                 ErrorCode.java
│                 GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

## Phases

- [ ] Phase 1: Entity 정의 — `admins`, `ip_acl`, `audit_logs` ERD와 enum 제약을 기준으로 엔티티와 타입 구조를 정리한다.
- [ ] Phase 2: Repository 구현 — 관리자 목록, ACL 목록, 중복 검증, 감사 로그 연계에 필요한 조회/영속화 리포지토리를 구성한다.
- [ ] Phase 3: Service 구현 — 마지막 `MASTER` 보호, 권한 검증, 상태 전이, 중복 검증, 감사 추적을 Service 인터페이스와 Impl에서 구현한다.
- [ ] Phase 4: API 구현 — Controller와 docs 인터페이스를 분리하고 `AdminManagementDTO`, `AdminAclDTO` 계약에 맞춰 관리자 계정 및 IP ACL 엔드포인트를 `ApiResponse`로 노출한다.
- [ ] Phase 5: 문서화 — Swagger docs, 공통/도메인 ErrorCode 분리, 요청/응답 계약, 권한 정책이 실제 구현과 일치하도록 정리한다.
- [ ] Phase 6: 테스트 — 권한 분기, 중복 오류, 마지막 `MASTER` 예외, 1-based 페이지네이션, 감사 추적 동작을 검증한다.
