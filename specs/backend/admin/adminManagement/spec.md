# Feature Specification: adminManagement

**Feature Branch**: `feature/admin-management-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 관리자 계정 운영 및 권한 통제 (Priority: P1)

> `MASTER` 관리자는 관리자 계정을 생성하고, 권한과 상태를 변경하며, 필요 시 계정을 삭제할 수 있다.

**Acceptance Scenarios**:

1. **Given** `MASTER` 관리자가 관리자 운영 화면에 접근한 상태에서, **When** 관리자 KPI 요약과 계정 목록 조회를 요청하면, **Then** 시스템은 현재 관리자 계정 현황을 응답해야 한다.
2. **Given** `MASTER` 관리자가 신규 관리자 계정 정보를 입력한 상태에서, **When** 계정 생성을 요청하면, **Then** 시스템은 유효한 관리자 계정을 생성해야 한다.
3. **Given** `MASTER` 관리자가 기존 관리자 계정을 선택한 상태에서, **When** 권한 변경 또는 상태 변경을 요청하면, **Then** 시스템은 요청된 변경사항을 반영해야 한다.
4. **Given** `MASTER` 관리자가 삭제 가능한 관리자 계정을 선택한 상태에서, **When** 계정 삭제를 요청하면, **Then** 시스템은 해당 계정을 삭제 처리해야 한다.
5. **Given** `MASTER`가 아닌 관리자가 관리자 계정 생성, 변경, 삭제를 시도한 상태에서, **When** 요청을 보내면, **Then** 시스템은 권한 부족 오류를 반환해야 한다.

---

### User Story 2 - IP ACL 운영 관리 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 관리자 접속 제어를 위한 IP ACL 목록을 조회하고, `MASTER`는 ACL을 등록, 활성/비활성 전환, 삭제할 수 있다.

**Acceptance Scenarios**:

1. **Given** `MASTER` 또는 `BACKEND` 관리자가 ACL 운영 화면에 접근한 상태에서, **When** ACL 목록 조회를 요청하면, **Then** 시스템은 등록된 ACL 목록과 상태를 페이지네이션 형태로 반환해야 한다.
2. **Given** `MASTER` 관리자가 신규 ACL 정보를 입력한 상태에서, **When** ACL 등록을 요청하면, **Then** 시스템은 유효한 IP ACL을 생성해야 한다.
3. **Given** `MASTER` 관리자가 기존 ACL을 선택한 상태에서, **When** 활성/비활성 변경을 요청하면, **Then** 시스템은 ACL의 `isEnabled` 상태를 반영해야 한다.
4. **Given** `MASTER` 관리자가 기존 ACL을 선택한 상태에서, **When** ACL 삭제를 요청하면, **Then** 시스템은 해당 ACL을 삭제 처리해야 한다.
5. **Given** `MASTER`가 아닌 관리자가 ACL 등록, 활성 상태 변경, 삭제를 시도한 상태에서, **When** 요청을 보내면, **Then** 시스템은 권한 부족 오류를 반환해야 한다.

---

### User Story 3 - 관리자 운영 안전장치 및 감사 추적 연계 (Priority: P2)

> 시스템은 관리자 운영 변경이 잘못되거나 위험하게 수행되지 않도록 제약을 적용하고, 주요 변경은 추적 가능한 운영 이력과 연결될 수 있어야 한다.

**Acceptance Scenarios**:

1. **Given** 마지막 `MASTER` 계정만 남아 있는 상태에서, **When** 해당 계정의 권한 변경, 잠금, 삭제를 요청하면, **Then** 시스템은 요청을 거부해야 한다.
2. **Given** 이미 사용 중인 관리자 이메일 또는 이미 등록된 ACL IP 범위가 존재하는 상태에서, **When** 동일 값으로 생성 요청을 보내면, **Then** 시스템은 중복 오류를 반환해야 한다.
3. **Given** 관리자 계정 또는 ACL 변경 작업이 성공한 상태에서, **When** 운영 이력 추적이 필요한 변경이 발생하면, **Then** 시스템은 감사 추적이 가능한 변경 단위로 처리되어야 한다.

---

### Edge Cases

* 존재하지 않는 `adminId`에 대해 권한 변경, 상태 변경, 삭제를 요청하면 어떻게 처리하는가?
* 존재하지 않는 `aclId`에 대해 활성/비활성 변경, 삭제를 요청하면 어떻게 처리하는가?
* 이미 사용 중인 `email`로 관리자 계정 생성 요청이 들어오면 어떻게 처리하는가?
* 이미 등록된 `ip_range`로 ACL 등록 요청이 들어오면 어떻게 처리하는가?
* 허용되지 않은 `admin_role` 또는 `status` 값이 요청되면 어떻게 처리하는가?
* 마지막 `MASTER` 계정에 대한 변경/잠금/삭제 요청은 어떻게 차단하는가?
* ACL 목록 조회 시 `page`, `size`가 잘못된 값이면 어떻게 처리하는가?

## Requirements

### Functional Requirements

* **FR-001**: 시스템은 `MASTER` 관리자에게 관리자 관리 KPI 요약 조회 기능을 제공해야 한다.
* **FR-002**: 시스템은 `MASTER` 관리자에게 관리자 계정 목록 조회 기능을 제공해야 한다.
* **FR-003**: 시스템은 `MASTER` 관리자에게 관리자 계정 생성 기능을 제공해야 한다.
* **FR-004**: 시스템은 `MASTER` 관리자에게 관리자 계정 권한 변경 기능을 제공해야 한다.
* **FR-005**: 시스템은 `MASTER` 관리자에게 관리자 계정 잠금/해제 기능을 제공해야 한다.
* **FR-006**: 시스템은 `MASTER` 관리자에게 관리자 계정 삭제 기능을 제공해야 한다.
* **FR-007**: 시스템은 관리자 계정의 권한 값을 `MASTER`, `CS`, `BACKEND`로 제한해야 한다.
* **FR-008**: 시스템은 관리자 계정의 상태 값을 `ACTIVE`, `LOCKED`로 제한해야 한다.
* **FR-009**: 시스템은 관리자 계정 생성 시 이메일 중복을 허용하지 않아야 한다.
* **FR-010**: 시스템은 마지막 `MASTER` 계정에 대한 권한 변경, 잠금/해제, 삭제를 허용하지 않아야 한다.
* **FR-011**: 시스템은 `MASTER` 또는 `BACKEND` 관리자에게 IP ACL 목록 조회 기능을 제공해야 한다.
* **FR-012**: 시스템은 `MASTER` 관리자에게 IP ACL 등록 기능을 제공해야 한다.
* **FR-013**: 시스템은 `MASTER` 관리자에게 IP ACL 활성/비활성 변경 기능을 제공해야 한다.
* **FR-014**: 시스템은 `MASTER` 관리자에게 IP ACL 삭제 기능을 제공해야 한다.
* **FR-015**: 시스템은 동일한 `ipRange` ACL의 중복 등록을 허용하지 않아야 한다.
* **FR-016**: 시스템은 ACL 요청/응답 필드 명칭과 구조를 `api-schema.md` 계약(`label`, `ipRange`, `description`, `isEnabled`, `ipAclId`, `createdAt`, `updatedAt`) 기준으로 일관되게 관리해야 한다.
* **FR-017**: 시스템은 목록 조회 응답을 `ApiResponse<T>` 래퍼와 페이지네이션 구조(`content`, `page`, `size`, `totalElements`, `totalPages`)로 반환해야 한다.
* **FR-018**: 시스템은 모든 관리자 관리 API에 JWT 기반 인증과 역할 기반 접근 제어를 적용해야 한다.
* **FR-019**: 시스템은 문서상 권한 명칭 `MASTER`, `BACKEND`, `CS`를 Spring Security의 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑해야 한다.
* **FR-020**: 시스템은 정의된 `ErrorCode` 기반으로 권한 부족, 중복, 미존재, 검증 오류를 일관되게 반환해야 한다.
* **FR-021**: 시스템은 관리자 계정 및 ACL의 주요 변경 작업이 감사 추적 가능한 운영 변경 단위로 처리되도록 보장해야 한다.
* **FR-022**: 시스템은 관리자 관리 기능을 `admin` 패키지 범위에서 유지해야 하며 사용자 기능 요구사항을 포함하지 않아야 한다.

### Key Entities

* **Admin**: 관리자 계정의 이메일, 비밀번호 해시, 이름, 권한, 상태, 마지막 로그인 시각, 마지막 로그인 IP, 생성 시각, 수정 시각을 관리하는 엔티티. `lastLoginAt`, `lastLoginIp`는 인증 도메인이 로그인 성공 시 갱신하고, `adminManagement`는 해당 값을 조회/표시만 한다.
* **IpAcl**: 관리자 접속 허용 대상의 IP 범위, 라벨, 활성 여부, 설명, 생성 시각, 수정 시각을 관리하는 엔티티
* **AuditLog**: 관리자 운영 변경에 대해 행위 주체, 액션, 대상, 심각도, 상세 내용, 발생 시각을 추적하기 위한 엔티티. `adminManagement`는 FR-021을 만족하기 위해 관리자 계정/ACL 변경 시 AuditLog를 생성하지만, 감사 로그 조회 전용 API는 이 범위에 포함하지 않는다.

## Success Criteria

* **SC-001**: `MASTER` 권한 사용자는 관리자 KPI 요약, 계정 목록, 생성, 권한 변경, 상태 변경, 삭제 API를 모두 정상 수행할 수 있다.
* **SC-002**: `MASTER`가 아닌 사용자의 관리자 계정 변경 요청은 100% 권한 오류로 차단된다.
* **SC-003**: `MASTER` 또는 `BACKEND` 사용자는 ACL 목록 조회를 수행할 수 있고, `MASTER`만 ACL 등록/변경/삭제를 수행할 수 있다.
* **SC-004**: 중복 이메일 관리자 생성 요청과 중복 `ipRange` ACL 등록 요청은 모두 정의된 충돌 오류로 처리된다.
* **SC-005**: 마지막 `MASTER` 계정에 대한 권한 변경, 잠금/해제, 삭제 요청은 모두 차단된다.
* **SC-006**: 관리자 목록 및 ACL 목록 응답은 모두 `ApiResponse<T>`와 1-based 페이지네이션 구조를 만족한다.
* **SC-007**: 존재하지 않는 `adminId` 또는 `aclId` 요청은 100% 미존재 오류로 처리된다.

## Assumptions

* 본 문서는 `adminManagement` 도메인의 관리자 계정 및 IP ACL 운영 범위만 다루며, 대시보드, AI 메트릭스, 감사 로그 조회 전용 기능, 스크래핑 기능은 범위 외로 본다.
* 관리자 관리 기능은 Spring Boot 백엔드에서 직접 처리하며 FastAPI 연동은 없다.
* Query Parameter, API 경로, ERD 컬럼, Enum 값, 권한 정책은 이미 확정되었으며 본 문서는 해당 계약을 기준으로 기능 요구사항만 정리한다.
