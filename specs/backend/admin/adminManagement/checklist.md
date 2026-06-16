# Checklist: adminManagement

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지"를 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 - Entity

- [x] `Admin`, `IpAcl`, `AuditLog` 엔티티 필드가 ERD 컬럼명, null 허용 여부, PK/UNIQUE 제약과 일치한다.
- [x] `AdminRole`, `AdminStatus` Enum 값이 DB CHECK 제약조건(`MASTER`, `CS`, `BACKEND` / `ACTIVE`, `LOCKED`)과 일치한다.
- [x] JPA Enum 매핑이 `EnumType.STRING`으로 적용되어 있다.

## Phase 2 - Repository

- [x] `AdminRepository`가 관리자 이메일 중복 확인과 관리자 목록 조회에 필요한 메서드를 제공한다.
- [x] `IpAclRepository`가 IP ACL 범위 중복 확인과 ACL 목록 조회에 필요한 메서드를 제공한다.
- [x] `AuditLogRepository`가 감사 로그 기록 저장에 필요한 메서드를 제공한다.
- [x] `GET /api/v1/admin/admins` Query Parameter가 `admins.email`, `admins.name`, `admins.admin_role`, `admins.status` 매핑과 일치한다.
- [x] 관리자 목록 `keyword` 필터가 `admins.email`, `admins.name` 기준으로 동작한다.
- [x] 관리자 목록 `role` 필터가 `admins.admin_role` 기준으로 동작한다.
- [x] 관리자 목록 `status` 필터가 `admins.status` 기준으로 동작한다.

## Phase 3 - Service

- [x] 비즈니스 로직이 Controller나 Repository가 아니라 Service Layer에 위치한다.
- [x] Service가 인터페이스와 `impl` 구현체로 분리되어 있다.
- [x] 관리자 이메일 중복 검증이 Service Layer에서 수행된다.
- [x] IP ACL 범위 중복 검증이 Service Layer에서 수행된다.
- [x] 관리자 상태 중복 변경(`ACTIVE`, `LOCKED`)이 Service Layer에서 차단된다.
- [x] IP ACL 활성 상태 중복 변경(`isEnabled`)이 Service Layer에서 차단된다.
- [x] `GET /api/v1/admin/admin-acls`의 페이지네이션 조회가 `page`, `size` 1-based 외부 계약과 일치한다.
- [x] 관리자 계정과 IP ACL의 주요 변경 작업 시 Audit Log 기록 로직이 Service Layer에서 수행된다.
- [x] 비즈니스 예외가 `CustomException(ErrorCode)` 또는 도메인 ErrorCode 매핑 방식으로 처리된다.
- [x] `AdminManagementErrorCode`가 `global.exception.ErrorCode`와 분리되어 있다.

## Phase 4 - API

- [x] `GET /api/v1/admin/admins/summary`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `GET /api/v1/admin/admins`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `POST /api/v1/admin/admins`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `PATCH /api/v1/admin/admins/{adminId}/role`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `PATCH /api/v1/admin/admins/{adminId}/status`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `DELETE /api/v1/admin/admins/{adminId}`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `GET /api/v1/admin/admin-acls`가 `MASTER`, `BACKEND` 권한 정책과 일치하게 동작한다.
- [x] `POST /api/v1/admin/admin-acls`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `PATCH /api/v1/admin/admin-acls/{aclId}/enabled`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] `DELETE /api/v1/admin/admin-acls/{aclId}`가 `MASTER` 권한 정책과 일치하게 동작한다.
- [x] 모든 성공 응답이 `ApiResponse<T>` 래퍼 형식을 사용한다.
- [x] 모든 성공 응답이 팀 `ApiResponse<T>` 규격(`success`, `statusCode`, `message`, `data`)과 일치한다.
- [x] 목록 조회 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 사용한다.
- [x] 관리자 계정/ACL 생성, 수정, 삭제 API에 `page`, `size` Query Parameter가 노출되지 않는다.

## Phase 5 - Documentation

- [ ] `AdminManagementDocs` 인터페이스가 작성되어 있다.
- [ ] Swagger 어노테이션이 Controller가 아니라 docs 인터페이스에 분리되어 있다.
- [ ] Swagger 문서의 Method, Path, Auth, Query Parameter, Request Body, Response Body, Error Response가 실제 구현과 일치한다.
- [ ] `api-schema.md`의 Query Parameter와 ERD 컬럼 매핑이 실제 구현과 일치한다.
- [ ] `api-schema.md`의 Enum 값이 실제 구현 Enum 및 DB CHECK 제약과 일치한다.
- [ ] 도메인 ErrorCode 문서가 실제 예외 처리와 일치한다.

## Phase 6 - Test

- [ ] 관리자 KPI 요약, 관리자 목록, 관리자 생성, 권한 변경, 상태 변경, 삭제 테스트가 존재한다.
- [ ] IP ACL 목록, 등록, 활성/비활성 변경, 삭제 테스트가 존재한다.
- [ ] 관리자 목록 `keyword`, `role`, `status` 필터 테스트가 존재한다.
- [ ] 관리자 이메일 중복, IP ACL 범위 중복, 미존재 `adminId`/`aclId` 예외 테스트가 존재한다.
- [ ] 관리자 상태 중복 변경과 IP ACL 중복 상태 변경 예외 테스트가 존재한다.
- [ ] 역할별 접근 제어 테스트가 존재한다.
- [ ] `ApiResponse<T>`와 1-based 페이지네이션 응답 형식 테스트가 존재한다.
- [ ] Audit Log 기록 검증 테스트가 존재한다.

## 외부 연동 검증

- [x] 외부 보안 장비나 별도 ACL 시스템과의 직접 동기화 코드가 본 도메인 구현에 포함되지 않는다.

## 코드 품질

- [x] Entity를 API 응답으로 직접 반환하지 않는다.
- [x] `new RuntimeException(...)` 직접 생성 없이 공통/도메인 ErrorCode 기반 예외 처리만 사용한다.
- [x] Repository에서 벌크 업데이트나 직접 상태 변경으로 `Admin.status`, `Admin.adminRole`, `IpAcl.isEnabled`를 우회 수정하지 않는다.

## 머지 전 최종 확인

- [ ] `spec.md`, `constitution.md`, `plan.md`, `tasks.md`의 요구사항과 실제 구현 범위가 충돌하지 않는다.
- [ ] constitution.md의 불변 규칙(`email` 유일성, `ipRange` 유일성, Enum 범위, 중복 상태 변경 차단)이 구현과 테스트에 반영되어 있다.
- [ ] Query Parameter와 ERD 컬럼 매핑, Enum 값, Role 정책, ErrorCode 정책이 문서와 구현 모두에서 일치한다.
- [ ] tasks.md의 모든 작업 항목이 완료되었거나 미완료 사유가 PR에 정리되어 있다.
