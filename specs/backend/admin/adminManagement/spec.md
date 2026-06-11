# Feature Specification: adminManagement

**Feature Branch**: `docs/admin-management-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 관리자 계정 운영 (Priority: P1)

> `MASTER` 관리자는 관리자 계정 KPI를 조회하고 관리자 계정을 생성, 권한 변경, 상태 변경, 삭제할 수 있다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 관리자가 관리자 관리 화면에 접근한 경우, **When** KPI 요약과 관리자 계정 목록 조회를 요청하면, **Then** 시스템은 관리자 현황을 `ApiResponse` 규격으로 반환한다.
2. **Given** `MASTER` 관리자가 신규 관리자 계정 정보를 입력한 경우, **When** 계정 생성을 요청하면, **Then** 시스템은 유효한 관리자 계정을 생성하고 기본 상태를 `ACTIVE`로 저장한다.
3. **Given** `MASTER` 관리자가 기존 관리자 계정을 선택한 경우, **When** 권한 또는 상태 변경을 요청하면, **Then** 시스템은 허용된 Enum 값 범위 안에서 변경 사항을 반영한다.
4. **Given** `MASTER` 관리자가 삭제 가능한 관리자 계정을 선택한 경우, **When** 계정 삭제를 요청하면, **Then** 시스템은 해당 계정을 삭제하고 성공 응답을 반환한다.
5. **Given** `MASTER`가 아닌 관리자가 관리자 계정 생성, 수정, 삭제 API를 호출한 경우, **When** 권한 검증이 수행되면, **Then** 시스템은 공통 인가 실패 응답으로 요청을 차단한다.

---

### User Story 2 - IP ACL 운영 (Priority: P1)

> `MASTER`와 `BACKEND` 관리자는 IP ACL 목록을 조회할 수 있고, `MASTER` 관리자는 IP ACL을 등록, 활성/비활성 변경, 삭제할 수 있다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 IP ACL 관리 화면에 접근한 경우, **When** ACL 목록 조회를 요청하면, **Then** 시스템은 `content`, `page`, `size`, `totalElements`, `totalPages` 구조로 ACL 목록을 반환한다.
2. **Given** `MASTER` 관리자가 신규 ACL 정보를 입력한 경우, **When** ACL 등록을 요청하면, **Then** 시스템은 중복되지 않는 `ipRange`에 대해서만 ACL을 생성한다.
3. **Given** `MASTER` 관리자가 기존 ACL을 선택한 경우, **When** 활성/비활성 변경을 요청하면, **Then** 시스템은 `isEnabled` 값을 요청 상태로 반영한다.
4. **Given** `MASTER` 관리자가 기존 ACL을 선택한 경우, **When** ACL 삭제를 요청하면, **Then** 시스템은 해당 ACL을 삭제하고 성공 응답을 반환한다.
5. **Given** `BACKEND` 또는 다른 권한 관리자가 ACL 등록, 상태 변경, 삭제를 시도한 경우, **When** 권한 검증이 수행되면, **Then** 시스템은 공통 인가 실패 응답으로 요청을 차단한다.

---

### User Story 3 - 운영 안전장치와 감사 추적 연계 (Priority: P2)

> 시스템은 관리자 계정과 ACL 변경 과정에서 중복, 미존재, 잘못된 상태 전이 같은 운영 위험을 방지하고 감사 추적 가능한 변경 단위를 유지해야 한다.

**Acceptance Scenarios**:
1. **Given** 이미 사용 중인 관리자 이메일 또는 이미 등록된 `ipRange`가 존재하는 경우, **When** 동일 값으로 생성 요청을 보내면, **Then** 시스템은 중복 생성 없이 도메인 ErrorCode 기반 오류를 반환한다.
2. **Given** 존재하지 않는 `adminId` 또는 `aclId`를 대상으로 변경 요청이 들어온 경우, **When** 시스템이 대상을 조회하면, **Then** 시스템은 `ADMIN_NOT_FOUND` 또는 `IP_ACL_NOT_FOUND` 오류를 반환한다.
3. **Given** 관리자 상태 변경 또는 ACL 활성 상태 변경 요청이 현재 상태와 동일한 값으로 들어온 경우, **When** 시스템이 상태 전이를 검증하면, **Then** 시스템은 중복 상태 변경 오류를 반환한다.
4. **Given** 관리자 계정 또는 ACL 변경 작업이 성공한 경우, **When** 운영 이력 추적이 필요한 변경이 발생하면, **Then** 시스템은 감사 추적 가능한 변경 단위로 처리한다.

---

### Edge Cases

- 존재하지 않는 `adminId`로 권한 변경, 상태 변경, 삭제를 요청하면 어떻게 처리하는가?
- 존재하지 않는 `aclId`로 활성/비활성 변경, 삭제를 요청하면 어떻게 처리하는가?
- 이미 사용 중인 `email`로 관리자 계정 생성을 요청하면 어떻게 처리하는가?
- 이미 등록된 `ipRange`로 ACL 등록을 요청하면 어떻게 처리하는가?
- 허용되지 않은 `adminRole` 또는 `status` 값이 전달되면 어떻게 처리하는가?
- 이미 `LOCKED` 상태인 관리자에게 다시 `LOCKED`를 요청하거나, 이미 `ACTIVE` 상태인 관리자에게 다시 `ACTIVE`를 요청하면 어떻게 처리하는가?
- 이미 활성 상태인 ACL에 다시 활성 요청하거나, 이미 비활성 상태인 ACL에 다시 비활성 요청하면 어떻게 처리하는가?
- 목록 조회 API에서 `page`, `size`는 외부 계약상 1-based를 유지하면서 내부 Pageable 변환 시 `page - 1`이 적용되는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/admin/admins/summary`를 통해 `MASTER` 관리자에게 관리자 관리 KPI 요약 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 `GET /api/v1/admin/admins`를 통해 `MASTER` 관리자에게 관리자 계정 목록 조회 기능을 제공해야 한다.
- **FR-003**: 시스템은 관리자 계정 목록 조회 시 `keyword`, `role`, `status`, `page`, `size` Query Parameter 계약을 지원해야 한다.
- **FR-004**: 시스템은 관리자 계정 목록 조회에서 `keyword`를 `admins.email`, `admins.name` 기준 검색 조건으로 해석해야 한다.
- **FR-005**: 시스템은 `POST /api/v1/admin/admins`를 통해 `MASTER` 관리자에게 관리자 계정 생성 기능을 제공해야 한다.
- **FR-006**: 시스템은 관리자 계정 생성 시 `admins.email` 중복을 허용하지 않아야 하며, 중복 시 `ADMIN_EMAIL_ALREADY_EXISTS`를 반환해야 한다.
- **FR-007**: 시스템은 `PATCH /api/v1/admin/admins/{adminId}/role`을 통해 `MASTER` 관리자에게 관리자 권한 변경 기능을 제공해야 한다.
- **FR-008**: 시스템은 관리자 권한 값을 `MASTER`, `CS`, `BACKEND` 범위로 제한해야 하며, 허용되지 않은 값은 `INVALID_ADMIN_ROLE`로 처리해야 한다.
- **FR-009**: 시스템은 `PATCH /api/v1/admin/admins/{adminId}/status`를 통해 `MASTER` 관리자에게 관리자 상태 변경 기능을 제공해야 한다.
- **FR-010**: 시스템은 관리자 상태 값을 `ACTIVE`, `LOCKED` 범위로 제한해야 하며, 허용되지 않은 값은 `INVALID_ADMIN_STATUS`로 처리해야 한다.
- **FR-011**: 시스템은 이미 `LOCKED` 상태인 관리자에 대한 잠금 요청을 `ADMIN_ALREADY_LOCKED`로 처리해야 한다.
- **FR-012**: 시스템은 이미 `ACTIVE` 상태인 관리자에 대한 활성 요청을 `ADMIN_ALREADY_ACTIVE`로 처리해야 한다.
- **FR-013**: 시스템은 `DELETE /api/v1/admin/admins/{adminId}`를 통해 `MASTER` 관리자에게 관리자 계정 삭제 기능을 제공해야 한다.
- **FR-014**: 시스템은 관리자 계정 변경 또는 삭제 대상이 존재하지 않으면 `ADMIN_NOT_FOUND`를 반환해야 한다.
- **FR-015**: 시스템은 `GET /api/v1/admin/admin-acls`를 통해 `MASTER`, `BACKEND` 관리자에게 IP ACL 목록 조회 기능을 제공해야 한다.
- **FR-016**: 시스템은 `POST /api/v1/admin/admin-acls`를 통해 `MASTER` 관리자에게 IP ACL 등록 기능을 제공해야 한다.
- **FR-017**: 시스템은 IP ACL 등록 시 `ip_acl.ip_range` 중복을 허용하지 않아야 하며, 중복 시 `IP_ACL_DUPLICATED_RANGE`를 반환해야 한다.
- **FR-018**: 시스템은 `PATCH /api/v1/admin/admin-acls/{aclId}/enabled`를 통해 `MASTER` 관리자에게 IP ACL 활성/비활성 변경 기능을 제공해야 한다.
- **FR-019**: 시스템은 이미 활성 상태인 ACL에 대한 활성 요청을 `IP_ACL_ALREADY_ENABLED`로, 이미 비활성 상태인 ACL에 대한 비활성 요청을 `IP_ACL_ALREADY_DISABLED`로 처리해야 한다.
- **FR-020**: 시스템은 `DELETE /api/v1/admin/admin-acls/{aclId}`를 통해 `MASTER` 관리자에게 IP ACL 삭제 기능을 제공해야 한다.
- **FR-021**: 시스템은 ACL 변경 또는 삭제 대상이 존재하지 않으면 `IP_ACL_NOT_FOUND`를 반환해야 한다.
- **FR-022**: 시스템은 목록 조회 응답을 `ApiResponse<T>` 래퍼와 `content`, `page`, `size`, `totalElements`, `totalPages` 페이지네이션 구조로 반환해야 한다.
- **FR-023**: 시스템은 모든 관리자 관리 API에 JWT 기반 인증과 역할 기반 인가를 적용해야 한다.
- **FR-024**: 시스템은 문서상 권한 표기 `MASTER`, `BACKEND`, `CS`를 Spring Security의 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`와 일치하도록 해석해야 한다.
- **FR-025**: 시스템은 관리자 계정과 IP ACL의 주요 변경 작업을 감사 추적 가능한 변경 단위로 처리해야 한다.
- **FR-026**: 시스템은 `adminManagement` 문서를 관리자 계정과 IP ACL 기능 범위로 한정해야 하며, 감사 로그 조회 전용 API를 포함하지 않아야 한다.

### Key Entities

- **Admin**: `admin_id`, `email`, `password_hash`, `name`, `admin_role`, `status`, `last_login_at`, `last_login_ip`, `created_at`, `updated_at` 컬럼을 가지는 관리자 계정 엔티티
- **IpAcl**: `ip_acl_id`, `label`, `ip_range`, `is_enabled`, `description`, `created_at`, `updated_at` 컬럼을 가지는 관리자 접속 제어 엔티티
- **AuditLog**: `audit_log_id`, `admin_id`, `log_type`, `action`, `target_type`, `target_id`, `ip_address`, `severity`, `detail`, `created_at` 컬럼을 가지며 관리자 운영 변경 이력 추적에 연관되는 엔티티

## Success Criteria

- **SC-001**: `MASTER` 권한 사용자는 관리자 KPI 요약, 관리자 목록, 관리자 생성, 권한 변경, 상태 변경, 삭제 API를 100% 정상 호출할 수 있다.
- **SC-002**: `MASTER`가 아닌 사용자의 관리자 계정 생성/수정/삭제 요청은 100% 인가 실패로 차단된다.
- **SC-003**: `MASTER`와 `BACKEND` 사용자는 ACL 목록 조회를 수행할 수 있고, `MASTER`만 ACL 등록/상태 변경/삭제를 수행할 수 있다.
- **SC-004**: 중복 관리자 이메일 생성 요청은 100% `ADMIN_EMAIL_ALREADY_EXISTS`로, 중복 ACL 범위 등록 요청은 100% `IP_ACL_DUPLICATED_RANGE`로 처리된다.
- **SC-005**: 이미 잠금/활성 상태인 관리자에 대한 중복 상태 변경 요청은 각각 `ADMIN_ALREADY_LOCKED`, `ADMIN_ALREADY_ACTIVE`로 처리된다.
- **SC-006**: 이미 활성/비활성 상태인 ACL에 대한 중복 상태 변경 요청은 각각 `IP_ACL_ALREADY_ENABLED`, `IP_ACL_ALREADY_DISABLED`로 처리된다.
- **SC-007**: 존재하지 않는 `adminId`, `aclId` 요청은 100% `ADMIN_NOT_FOUND`, `IP_ACL_NOT_FOUND`로 처리된다.
- **SC-008**: 목록 조회 응답은 모두 `ApiResponse<T>`와 1-based `page` 기준의 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족한다.

## Assumptions

- `fastapi-schema.md`가 없으므로 본 스펙은 Spring Boot 기준으로만 작성하며, `adminManagement` 도메인에 대한 FastAPI 책임은 없다.
- Spring Boot는 관리자 계정 조회/변경, IP ACL 조회/변경, JWT 인증 연계, 도메인 ErrorCode 반환, 감사 추적 가능한 변경 단위 처리 책임을 가진다.
- FastAPI는 본 도메인 범위에서 관리자 계정, IP ACL, 감사 로그 연계 처리에 참여하지 않으며 Spring Boot를 호출하지 않는다.
- 외부 연동 시스템은 JWT 인증 체계와 운영 주체가 접근하는 관리자 프론트엔드이며, 외부 보안 장비나 별도 IP 제어 시스템과의 직접 동기화는 본 범위에 포함하지 않는다.
- 감사 로그 조회 API, 대시보드 통계, AI Metrics, 스크래핑, 사용자 도메인 기능은 v1 범위 외다.
