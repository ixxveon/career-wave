# Feature Specification: 플랫폼 관리자 (Manager)

**Feature Branch**: `001-manager`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 관리자 로그인 (Priority: P1)

관리자는 이메일과 비밀번호로 로그인하여 어드민 대시보드에 접근한다.

**Acceptance Scenarios**:
1. **Given** 등록된 관리자 계정, **When** 이메일/비밀번호 입력, **Then** JWT 토큰 발급 및 대시보드 진입
2. **Given** 잘못된 비밀번호, **When** 로그인 시도, **Then** 인증 실패 에러 반환

---

### User Story 2 - 관리자 권한 제어 (Priority: P2)

SUPER_ADMIN은 모든 기능에 접근하고, ADMIN은 제한된 기능만 접근한다.

**Acceptance Scenarios**:
1. **Given** SUPER_ADMIN 계정, **When** 관리자 계정 생성 요청, **Then** 신규 관리자 생성 성공
2. **Given** ADMIN 계정, **When** 관리자 계정 생성 요청, **Then** 403 Forbidden 반환

---

### Edge Cases
- 이미 로그인된 관리자가 재로그인하면?
- 토큰 만료 후 API 호출 시 처리?

## Requirements

### Functional Requirements
- **FR-001**: 관리자는 이메일/비밀번호로 로그인할 수 있어야 한다.
- **FR-002**: 로그인 성공 시 AccessToken과 RefreshToken을 발급한다.
- **FR-003**: SUPER_ADMIN과 ADMIN 두 가지 역할을 지원한다.
- **FR-004**: SUPER_ADMIN만 다른 관리자 계정을 생성/삭제할 수 있다.
- **FR-005**: 토큰 갱신(Refresh) API를 제공한다.

### Key Entities
- **Manager**: id, email, password, name, role(SUPER_ADMIN/ADMIN)

## Success Criteria
- **SC-001**: 로그인 응답 시간 500ms 이하
- **SC-002**: 잘못된 인증 시도 5회 이상 시 계정 잠금

## Assumptions
- 최초 SUPER_ADMIN 계정은 DB 시딩으로 생성한다.
- 소셜 로그인은 v1 범위 외
