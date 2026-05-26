# Feature Specification: 멘토 정산 (Settlement)

**Feature Branch**: `004-settlement`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 정산 목록 조회 (Priority: P1)

관리자는 멘토별 정산 현황을 월별/상태별로 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인 상태, **When** 정산 목록 조회, **Then** 페이징된 정산 목록 반환
2. **Given** settlementMonth=2026-05 필터, **When** 조회, **Then** 해당 월 정산 목록만 반환

---

### User Story 2 - 정산 확정 처리 (Priority: P1)

관리자는 PENDING 상태의 정산을 검토 후 확정(CONFIRMED)한다.

**Acceptance Scenarios**:
1. **Given** PENDING 정산, **When** 확정 처리, **Then** 상태 CONFIRMED로 변경
2. **Given** 이미 CONFIRMED된 정산, **When** 재확정 시도, **Then** 에러 반환

---

### User Story 3 - 정산 지급 완료 처리 (Priority: P2)

관리자는 CONFIRMED 정산에 대해 지급 완료(PAID) 처리를 한다.

**Acceptance Scenarios**:
1. **Given** CONFIRMED 정산, **When** 지급 완료 처리, **Then** 상태 PAID로 변경

---

### Edge Cases
- PENDING 상태를 바로 PAID로 변경 시도 시?
- 동일 멘토의 동일 월 정산이 중복 생성되면?

## Requirements

### Functional Requirements
- **FR-001**: 정산 목록을 월별/상태별 필터링 및 페이징으로 조회한다.
- **FR-002**: 정산 상태는 PENDING → CONFIRMED → PAID 순서로만 전이된다.
- **FR-003**: 관리자가 정산을 확정(CONFIRMED) 처리할 수 있다.
- **FR-004**: 관리자가 지급 완료(PAID) 처리할 수 있다.
- **FR-005**: 멘토별 정산 이력을 조회할 수 있다.

### Key Entities
- **Settlement**: id, mentorId, amount, settlementMonth(YYYY-MM), status

## Success Criteria
- **SC-001**: 정산 목록 조회 응답 1초 이하
- **SC-002**: 상태 전이 규칙 위반 시 명확한 에러 메시지 반환

## Assumptions
- 정산 금액 계산은 별도 배치 또는 멘토 앱에서 처리되며, 어드민은 확정/지급 처리만 담당한다.
- 실제 송금 연동은 v1 범위 외
