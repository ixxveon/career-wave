# Feature Specification: 정산 리포트 관리 API (Settlement Report)

**Feature Branch**: `feat/settlement-report`
**Status**: 스펙 완료
**담당**: 신보라

## User Scenarios & Testing

### User Story 1 — 정산 리포트 목록 조회 (Priority: P1)

> 관리자가 정산 리포트를 상태별로 조회하여 미확정 건을 파악한다.

**Acceptance Scenarios**:
1. **Given** 정산 리포트가 존재할 때, **When** GET /api/v1/admin/settlements 요청 시, **Then** 전체 목록을 settlement_period_start DESC 순으로 반환한다
2. **Given** status=PENDING으로 요청 시, **When** GET /api/v1/admin/settlements?status=PENDING 요청 시, **Then** settlement_status = PENDING인 리포트만 반환한다

---

### User Story 2 — 정산 리포트 상세 조회 (Priority: P1)

> 관리자가 정산 리포트의 상세 금액과 포함된 결제 내역을 확인하여 정확성을 검증한다.

**Acceptance Scenarios**:
1. **Given** 유효한 settlementId로 요청 시, **When** GET /api/v1/admin/settlements/{settlementId} 요청 시, **Then** 정산 요약 + 포함 결제/환불 항목 목록을 반환한다
2. **Given** 존재하지 않는 settlementId로 요청 시, **When** GET /api/v1/admin/settlements/{settlementId} 요청 시, **Then** 404 SETTLEMENT_NOT_FOUND를 반환한다

---

### User Story 3 — 정산 리포트 생성 (Priority: P1)

> 관리자가 특정 기간의 결제/환불 데이터를 집계하여 정산 리포트를 생성한다.

**Acceptance Scenarios**:
1. **Given** 2026-06-01 ~ 2026-06-30 기간으로 요청 시, **When** POST /api/v1/admin/settlements/generate 요청 시, **Then** 해당 기간 payments/refunds를 집계하여 PENDING 상태의 리포트를 생성한다
2. **Given** 이미 2026-06-01 ~ 2026-06-30 리포트가 존재할 때, **When** POST /api/v1/admin/settlements/generate 요청 시, **Then** 409 DUPLICATE_PERIOD를 반환한다
3. **Given** periodStart >= periodEnd로 요청 시, **When** POST /api/v1/admin/settlements/generate 요청 시, **Then** 400 INVALID_PERIOD를 반환한다

---

### User Story 4 — 정산 확정 (Priority: P1)

> 관리자가 검증이 완료된 정산 리포트를 확정 처리한다.

**Acceptance Scenarios**:
1. **Given** PENDING 상태의 정산 리포트에 대해, **When** PATCH /api/v1/admin/settlements/{settlementId}/confirm 요청 시, **Then** settlement_status = CONFIRMED, settled_at, admin_id가 저장된다
2. **Given** CONFIRMED 상태의 정산 리포트에 대해, **When** PATCH /api/v1/admin/settlements/{settlementId}/confirm 요청 시, **Then** 409 ALREADY_CONFIRMED를 반환한다

---

### Edge Cases

- EC-001: 정산 기간 내 결제/환불 데이터가 없는 경우 → 모든 금액 0, 빈 items로 리포트 생성
- EC-002: 동일 기간 정산 리포트 중복 생성 시도 → 409 DUPLICATE_PERIOD
- EC-003: periodStart >= periodEnd → 400 INVALID_PERIOD
- EC-004: CONFIRMED 상태 리포트에 재확정 시도 → 409 ALREADY_CONFIRMED
- EC-005: 존재하지 않는 settlementId 조회/확정 → 404 SETTLEMENT_NOT_FOUND
- EC-006: 정산 상세 조회 시 items가 수백 건 이상 → 페이지네이션 없이 전체 반환 (v1)

## Requirements

### Functional Requirements

- **FR-001**: 정산 목록은 settlement_period_start DESC로 정렬되어야 한다
- **FR-002**: 정산 목록 status 필터가 null이면 전체를 반환해야 한다
- **FR-003**: 정산 상세에 settlement_items → payments JOIN으로 결제 항목 상세를 포함해야 한다
- **FR-004**: 정산 생성 시 동일 기간(periodStart, periodEnd) 중복이면 409를 반환해야 한다
- **FR-005**: 정산 생성 시 periodStart >= periodEnd이면 400을 반환해야 한다
- **FR-006**: VAT 계산은 `supply_amount = net_sales_amount * 10 / 11` (원 단위 절사)이어야 한다
- **FR-007**: 정산 확정 시 PENDING이 아니면 409를 반환해야 한다
- **FR-008**: 정산 생성·확정 시 AuditLog에 감사 로그를 기록해야 한다
- **FR-009**: page는 1-based로 받아 Service에서 0-based로 변환해야 한다
- **FR-010**: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다
- **FR-011**: 모든 API 경로는 /api/v1/admin/ prefix를 사용해야 한다

### Key Entities

- **SettlementReport**: settlementId, periodStart, periodEnd, totalSalesAmount, totalRefundAmount, netSalesAmount, supplyAmount, vatAmount, totalTransactionCount, paidCount, refundCount, settlementStatus, settledAt, adminId, note
- **SettlementItem**: settlementItemId, settlementId, paymentId, amount, itemType

## Success Criteria

- **SC-001**: 정산 생성 시 payments/refunds 집계 금액과 settlement_items 합산이 일치한다
- **SC-002**: VAT 계산이 `net_sales_amount * 10 / 11` (원 단위 절사)로 정확하다
- **SC-003**: 동일 기간 중복 생성 시 409가 반환된다
- **SC-004**: CONFIRMED 리포트 재확정 시 409가 반환된다
- **SC-005**: 정산 생성·확정 시 감사 로그가 기록된다
- **SC-006**: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다

## Assumptions

- payments, refunds 테이블이 이미 존재하며 결제 데이터가 쌓이고 있다
- 정산 리포트 자동 생성 스케줄러는 v1 범위 외 (수동 생성만)
- MASTER 권한만 정산 확정 가능 여부는 구현 단계에서 결정
- 멘토 정산 기능 없음 (CareerWave는 멘토 서비스 미제공)
- 정산 상세 items 페이지네이션은 v1 범위 외
