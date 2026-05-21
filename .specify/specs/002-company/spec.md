# Feature Specification: 파트너 기업 (Company)

**Feature Branch**: `002-company`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 기업 목록 조회 (Priority: P1)

관리자는 가입 신청한 기업 목록을 상태별로 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인 상태, **When** 기업 목록 조회, **Then** 페이징된 기업 목록 반환
2. **Given** status=PENDING 필터, **When** 조회, **Then** 승인 대기 기업만 반환

---

### User Story 2 - 기업 승인/반려 (Priority: P1)

관리자는 기업 가입 신청을 승인하거나 반려할 수 있다.

**Acceptance Scenarios**:
1. **Given** PENDING 상태 기업, **When** 승인 처리, **Then** 상태 APPROVED로 변경
2. **Given** PENDING 상태 기업, **When** 반려 처리, **Then** 상태 REJECTED로 변경

---

### User Story 3 - 기업 상세 조회 (Priority: P2)

관리자는 기업의 상세 정보를 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 존재하는 기업 id, **When** 상세 조회, **Then** 기업 전체 정보 반환
2. **Given** 존재하지 않는 id, **When** 상세 조회, **Then** 404 반환

---

### Edge Cases
- 이미 APPROVED된 기업을 다시 승인하면?
- 사업자번호 중복 등록 시도 시?

## Requirements

### Functional Requirements
- **FR-001**: 기업 목록을 상태(PENDING/APPROVED/REJECTED/SUSPENDED)별로 필터링하여 조회한다.
- **FR-002**: 기업 상세 정보를 조회할 수 있다.
- **FR-003**: 관리자가 기업 승인/반려 처리를 할 수 있다.
- **FR-004**: 사업자번호 중복을 허용하지 않는다.
- **FR-005**: 기업 목록은 페이징을 지원한다.

### Key Entities
- **Company**: id, name, businessNumber, description, logoUrl, status

## Success Criteria
- **SC-001**: 목록 조회 응답 시간 1초 이하 (100건 기준)
- **SC-002**: 승인/반려 처리 후 상태 변경이 즉시 반영된다.

## Assumptions
- 기업 가입 신청은 별도 사용자 앱에서 처리되며, 어드민은 관리만 담당한다.
- 로고 이미지 업로드는 v1 범위 외 (URL 직접 입력)
