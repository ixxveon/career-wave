# Tasks: adminManagement

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 1~3시간 내 완료 가능한 단일 책임 작업으로 분해한다.

## Phase 1 - Entity

- [ ] `AdminRole.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [ ] `AdminStatus.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [ ] `Admin.java` 엔티티를 `admins` ERD 컬럼 기준으로 작성한다.
- [ ] `IpAcl.java` 엔티티를 `ip_acl` ERD 컬럼 기준으로 작성한다.
- [ ] `AuditLog.java` 엔티티를 `audit_logs` ERD 컬럼 기준으로 작성한다.

## Phase 2 - Repository

- [ ] `AdminRepository.java` 기본 조회 인터페이스를 작성한다.
- [ ] 관리자 이메일 중복 확인 조회 메서드를 추가한다.
- [ ] 관리자 목록 `keyword` 필터 조회 조건을 구현한다.
- [ ] 관리자 목록 `role` 필터 조회 조건을 구현한다.
- [ ] 관리자 목록 `status` 필터 조회 조건을 구현한다.
- [ ] 관리자 목록 페이지네이션 조회 조건을 정리한다.
- [ ] `IpAclRepository.java` 기본 조회 인터페이스를 작성한다.
- [ ] IP ACL 중복 범위 확인 조회 메서드를 추가한다.
- [ ] IP ACL 목록 페이지네이션 조회 조건을 정리한다.
- [ ] `AuditLogRepository.java` 감사 로그 저장 인터페이스를 작성한다.

## Phase 3 - Service

- [ ] `AdminManagementService.java` 인터페이스를 작성한다.
- [ ] 관리자 KPI 요약 조회 서비스 로직을 구현한다.
- [ ] 관리자 계정 목록 조회 서비스 로직을 구현한다.
- [ ] 관리자 계정 생성 서비스 로직을 구현한다.
- [ ] 관리자 권한 변경 서비스 로직을 구현한다.
- [ ] 관리자 상태 변경 서비스 로직을 구현한다.
- [ ] 관리자 계정 삭제 서비스 로직을 구현한다.
- [ ] IP ACL 목록 조회 서비스 로직을 구현한다.
- [ ] IP ACL 등록 서비스 로직을 구현한다.
- [ ] IP ACL 활성/비활성 변경 서비스 로직을 구현한다.
- [ ] IP ACL 삭제 서비스 로직을 구현한다.
- [ ] 감사 추적용 AuditLog 기록 연계 로직을 구현한다.
- [ ] `AdminManagementErrorCode.java` 도메인 오류 코드를 작성한다.

## Phase 4 - API

- [ ] `AdminManagementDTO.java`를 작성한다.
- [ ] `AdminAclDTO.java`를 작성한다.
- [ ] `GET /api/v1/admin/admins/summary` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/admins` Controller endpoint를 작성한다.
- [ ] `POST /api/v1/admin/admins` Controller endpoint를 작성한다.
- [ ] `PATCH /api/v1/admin/admins/{adminId}/role` Controller endpoint를 작성한다.
- [ ] `PATCH /api/v1/admin/admins/{adminId}/status` Controller endpoint를 작성한다.
- [ ] `DELETE /api/v1/admin/admins/{adminId}` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/admin-acls` Controller endpoint를 작성한다.
- [ ] `POST /api/v1/admin/admin-acls` Controller endpoint를 작성한다.
- [ ] `PATCH /api/v1/admin/admin-acls/{aclId}/enabled` Controller endpoint를 작성한다.
- [ ] `DELETE /api/v1/admin/admin-acls/{aclId}` Controller endpoint를 작성한다.
- [ ] `MASTER`, `BACKEND` 역할 정책과 JWT 인증 진입 조건을 API 계층에 반영한다.

## Phase 5 - Documentation

- [ ] `AdminManagementDocs.java` Swagger 인터페이스를 작성한다.
- [ ] 관리자 계정 API의 요청/응답 문서를 정리한다.
- [ ] IP ACL API의 요청/응답 문서를 정리한다.
- [ ] 관리자 계정/ACL Error Response 문서를 정리한다.
- [ ] `api-schema.md`와 구현 대상 API 계약의 정합성을 점검한다.
- [ ] `spec.md`, `constitution.md`, `plan.md`와 구현 범위 정합성을 점검한다.

## Phase 6 - Test

- [ ] 관리자 KPI 요약 조회 테스트를 작성한다.
- [ ] 관리자 계정 목록 조회 테스트를 작성한다.
- [ ] 관리자 계정 목록 `keyword` 필터 테스트를 작성한다.
- [ ] 관리자 계정 목록 `role` 필터 테스트를 작성한다.
- [ ] 관리자 계정 목록 `status` 필터 테스트를 작성한다.
- [ ] 관리자 계정 생성 테스트를 작성한다.
- [ ] 관리자 권한 변경 테스트를 작성한다.
- [ ] 관리자 상태 변경 테스트를 작성한다.
- [ ] 관리자 계정 삭제 테스트를 작성한다.
- [ ] IP ACL 목록 조회 테스트를 작성한다.
- [ ] IP ACL 등록 테스트를 작성한다.
- [ ] IP ACL 활성/비활성 변경 테스트를 작성한다.
- [ ] IP ACL 삭제 테스트를 작성한다.
- [ ] 관리자 이메일 중복 예외 테스트를 작성한다.
- [ ] IP ACL 범위 중복 예외 테스트를 작성한다.
- [ ] 관리자/ACL 미존재 예외 테스트를 작성한다.
- [ ] 관리자/ACL 중복 상태 변경 예외 테스트를 작성한다.
- [ ] 역할별 접근 제어 테스트를 작성한다.
- [ ] `ApiResponse<T>`와 1-based 페이지네이션 응답 형식 테스트를 작성한다.
- [ ] 감사 추적 AuditLog 기록 테스트를 작성한다.
