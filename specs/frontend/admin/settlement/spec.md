# Feature Specification: 정산 관리 (Settlement)

**Feature Branch**: `feat/267-settlement-reports`
**버전**: v2 (payment에서 분리)
**Status**: 스펙 작성 완료 — 구현 예정
**담당**: 신보라

---

## 도메인 개요

MASTER 관리자가 월별 정산 리포트를 조회·생성·확정하는 어드민 페이지.
스케줄러가 매월 1일 자동 생성하며, 수동 생성·재생성도 가능하다.
정산 데이터는 결제(DONE) + 환불(COMPLETED) 기반으로 집계된다.

- MASTER 전용 — MANAGER/VIEWER 역할에게 사이드바 메뉴 비노출
- 멘토 정산 기능 없음
- 기존 payment 탭의 정산 블라인드 처리를 대체

---

## 상태 정의

### settlement_reports.settlement_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 대기 | 집계 완료, 관리자 확인 전 |
| `CONFIRMED` | 확정 | 관리자 확인 완료 (비가역) |

### 상태 전이도

```text
PENDING ──► CONFIRMED (정산 확정 버튼)
CONFIRMED → 기타 전이 없음 (확정 버튼 비노출)
```

---

## User Stories & Acceptance Scenarios

### Story 1 — 정산 리포트 목록 조회 (Priority: P1)

> MASTER 관리자는 정산 리포트 목록을 조회하고 상태별로 필터링할 수 있다.

**Acceptance Scenarios**:
1. **Given** MASTER 로그인, **When** 정산 관리 페이지 진입, **Then** 정산 리포트 목록(정산기간/총매출/총환불/순매출/거래건수/상태)이 표시된다.
2. **Given** 정산 목록, **When** 상태 필터(전체/PENDING/CONFIRMED) 선택, **Then** 해당 상태 건만 표시된다.
3. **Given** 정산 목록, **When** 행 클릭, **Then** 정산 상세 페이지로 이동한다.
4. **Given** MANAGER/VIEWER 로그인, **When** 사이드바 확인, **Then** 정산 관리 메뉴가 비노출된다.

---

### Story 2 — 정산 리포트 상세 조회 (Priority: P1)

> MASTER 관리자는 정산 리포트의 상세 내역과 포함된 결제/환불 항목을 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 정산 상세 페이지, **When** 진입, **Then** 정산 정보(기간/총매출/총환불/순매출/공급가액/부가세/확정자/확정일/메모)와 항목 목록이 표시된다.
2. **Given** 항목 목록, **Then** 각 항목에 결제ID/주문번호/회원명/상품명/금액/유형(PAYMENT/REFUND)/결제승인일이 표시된다.
3. **Given** PENDING 상태 리포트, **Then** "정산 확정" 버튼이 노출된다.
4. **Given** CONFIRMED 상태 리포트, **Then** 확정 버튼이 비노출되고, 확정자/확정일이 표시된다.

---

### Story 3 — 정산 리포트 수동 생성 (Priority: P1)

> MASTER 관리자는 특정 기간의 정산 리포트를 수동으로 생성할 수 있다.

**Acceptance Scenarios**:
1. **Given** 정산 목록, **When** "정산 생성" 버튼 클릭, **Then** 기간 입력 폼(시작일/종료일)이 표시된다.
2. **Given** 기간 입력 완료, **When** "생성" 클릭, **Then** 서버에서 리포트를 생성하고 목록이 갱신된다.
3. **Given** 동일 기간 CONFIRMED 존재, **When** 생성 시도, **Then** 에러 메시지("이미 확정된 정산이 존재합니다")가 표시된다.
4. **Given** 동일 기간 PENDING 존재, **When** 생성 시도, **Then** 기존 PENDING 삭제 후 재생성(서버 처리)되어 목록이 갱신된다.
5. **Given** 기간 입력, **When** 시작일 >= 종료일, **Then** 프론트에서 유효성 검증하여 생성 버튼을 비활성화한다.

---

### Story 4 — 정산 확정 (Priority: P1)

> MASTER 관리자는 PENDING 상태의 정산 리포트를 확정 처리할 수 있다.

**Acceptance Scenarios**:
1. **Given** PENDING 리포트 상세, **When** "정산 확정" 클릭, **Then** 확인 모달이 표시된다.
2. **Given** 확인 모달, **When** 메모 입력(선택) 후 "확정" 클릭, **Then** 서버 응답 기준으로 상태가 CONFIRMED로 갱신되고, 확정 버튼이 사라진다.
3. **Given** 이미 CONFIRMED 건, **When** 재확정 시도, **Then** 에러 메시지("이미 확정된 정산입니다")가 표시된다.

---

### Edge Cases

- MASTER 외 역할 → 정산 관리 메뉴 자체가 사이드바에 비노출
- 시작일 >= 종료일 → 프론트 유효성 검증, 생성 버튼 비활성
- CONFIRMED 리포트 → 확정 버튼 비노출, 재생성 불가(서버 409)
- 빈 기간(결제/환불 0건) → 금액 0원 리포트 정상 생성

---

## Functional Requirements

- **FR-001**: 정산 리포트 목록을 `settlementStatus` 기준으로 필터링
- **FR-002**: 정산 상세에서 포함 결제/환불 항목 목록 표시
- **FR-003**: PENDING 리포트에만 "정산 확정" 버튼 노출
- **FR-004**: 정산 확정 시 서버 응답 기준으로 상태 갱신 (낙관적 업데이트 금지)
- **FR-005**: 수동 생성 시 기간 유효성 프론트 검증 (시작일 < 종료일)
- **FR-006**: 에러 응답(409 ALREADY_CONFIRMED, DUPLICATE_PERIOD) 사용자 메시지 표시
- **FR-007**: MASTER 외 역할에게 정산 관리 메뉴 비노출

---

## Key Entities

### settlement_reports

| 필드 | 타입 | 설명 |
|---|---|---|
| `settlement_id` | BIGSERIAL PK | 정산 고유 ID |
| `settlement_period_start` | DATE | 정산 시작일 |
| `settlement_period_end` | DATE | 정산 종료일 |
| `total_sales_amount` | BIGINT | 총 매출 |
| `total_refund_amount` | BIGINT | 총 환불 |
| `net_sales_amount` | BIGINT | 순 매출 (매출 - 환불) |
| `supply_amount` | BIGINT | 공급가액 |
| `vat_amount` | BIGINT | 부가세 |
| `total_transaction_count` | INT | 총 거래 건수 |
| `paid_count` | INT | 결제 건수 |
| `refund_count` | INT | 환불 건수 |
| `settlement_status` | VARCHAR | PENDING / CONFIRMED |
| `admin_id` | BIGINT FK NULL | 확정 관리자 |
| `settled_at` | TIMESTAMPTZ NULL | 확정 시각 |
| `note` | TEXT NULL | 메모 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

### settlement_items

| 필드 | 타입 | 설명 |
|---|---|---|
| `settlement_item_id` | BIGSERIAL PK | 항목 ID |
| `settlement_id` | BIGINT FK | 정산 리포트 FK |
| `payment_id` | UUID FK | 결제 FK |
| `amount` | BIGINT | 금액 |
| `item_type` | VARCHAR | PAYMENT / REFUND |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

---

## Success Criteria

- **SC-001**: 정산 목록 상태 필터 정확히 동작
- **SC-002**: 정산 상세 항목 목록이 리포트 금액과 일치
- **SC-003**: 정산 확정 후 서버 응답 기준 상태 배지 즉시 갱신
- **SC-004**: 수동 생성 시 동일 기간 CONFIRMED 건 409 에러 표시
- **SC-005**: MASTER 외 역할 정산 메뉴 비노출

---

## Assumptions

- 스케줄러 자동 생성은 백엔드 담당 — 프론트엔드는 목록 조회/수동 생성/확정만 처리
- 금액 단위: KRW (원)
- 금액 타입: BIGINT (init.sql 기준)
- 기간 필터(날짜 범위 검색)는 현재 범위 외 — 상태 필터만 제공
- 멘토 정산 기능 없음
