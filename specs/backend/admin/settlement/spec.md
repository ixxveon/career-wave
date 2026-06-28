# Spec: 정산 리포트 관리 API (Settlement Report)

**Feature Branch**: `feat/settlement-report`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

월별 정산 리포트를 생성·조회·확정하는 관리자 전용 REST API.
`payments` 테이블의 결제/환불 데이터를 기간별로 집계하여 `settlement_reports`에 요약 저장하고,
개별 결제 건과의 매핑은 `settlement_items`로 관리한다.

- VAT 계산: B2C 카드결제 기준 `총액 / 1.1 = 공급가액`
- 정산 기간: 월 단위 (종합소득세/연말정산 목적)
- 멘토 정산 기능 없음 (CareerWave는 멘토 서비스 미제공)

---

## ERD

### settlement_reports (init.sql 기준)

```sql
settlement_id           BIGSERIAL       PK
settlement_period_start DATE            NOT NULL
settlement_period_end   DATE            NOT NULL
total_sales_amount      INTEGER         NOT NULL DEFAULT 0     -- 총 매출액 (원)
total_refund_amount     INTEGER         NOT NULL DEFAULT 0     -- 총 환불액 (원)
net_sales_amount        INTEGER         NOT NULL DEFAULT 0     -- 순매출액 (매출 - 환불)
supply_amount           INTEGER         NOT NULL DEFAULT 0     -- 공급가액 (VAT 제외)
vat_amount              INTEGER         NOT NULL DEFAULT 0     -- 부가세
total_transaction_count INTEGER         NOT NULL DEFAULT 0     -- 총 결제 건수
paid_count              INTEGER         NOT NULL DEFAULT 0     -- 결제 완료 건수
refund_count            INTEGER         NOT NULL DEFAULT 0     -- 환불 건수
settlement_status       VARCHAR(20)     NOT NULL               -- PENDING / CONFIRMED
settled_at              TIMESTAMPTZ     NULL                   -- 정산 확정 일시
settled_by              BIGINT          FK NULL REFERENCES admins(admin_id)
note                    TEXT            NULL
created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()

CONSTRAINT uq_settlement_period UNIQUE (settlement_period_start, settlement_period_end)
```

**settlement_status 상태 흐름**:
- `PENDING` → `CONFIRMED` : 관리자 확정

### settlement_items (init.sql 기준)

```sql
settlement_item_id  BIGSERIAL       PK
settlement_id       BIGINT          FK NOT NULL REFERENCES settlement_reports(settlement_id)
payment_id          UUID            FK NOT NULL REFERENCES payments(payment_id)
amount              INTEGER         NOT NULL
item_type           VARCHAR(20)     NOT NULL   -- PAYMENT / REFUND
created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()

CONSTRAINT uq_settlement_item_payment UNIQUE (settlement_id, payment_id, item_type)
```

### 테이블 관계

```
settlement_reports (1) ── settlement_items (N) ── payments (1)
        │
        └── settled_by → admins
```

---

## 패키지 구조

```text
admin/settlement/
├── entity/
│   ├── SettlementReport.java
│   └── SettlementItem.java
├── repository/
│   ├── SettlementReportRepository.java
│   ├── SettlementReportQueryRepository.java
│   └── SettlementItemRepository.java
├── type/
│   ├── SettlementStatus.java          -- PENDING / CONFIRMED
│   └── SettlementItemType.java        -- PAYMENT / REFUND
├── service/
│   ├── AdminSettlementService.java
│   └── impl/
│       └── AdminSettlementServiceImpl.java
├── controller/
│   └── AdminSettlementController.java
├── dto/
│   └── SettlementDTO.java
├── exception/
│   └── AdminSettlementErrorCode.java
└── docs/
    └── AdminSettlementControllerDocs.java
```

---

## DTO 구조

### SettlementDTO.java

```java
public class SettlementDTO {

    // 정산 리포트 목록 항목
    public record ResponseList(
        Long settlementId,
        LocalDate periodStart,
        LocalDate periodEnd,
        int totalSalesAmount,
        int totalRefundAmount,
        int netSalesAmount,
        int totalTransactionCount,
        SettlementStatus settlementStatus,
        ZonedDateTime createdAt
    ) {}

    // 정산 리포트 상세
    public record ResponseDetail(
        Long settlementId,
        LocalDate periodStart,
        LocalDate periodEnd,
        int totalSalesAmount,
        int totalRefundAmount,
        int netSalesAmount,
        int supplyAmount,
        int vatAmount,
        int totalTransactionCount,
        int paidCount,
        int refundCount,
        SettlementStatus settlementStatus,
        ZonedDateTime settledAt,
        String settledByName,
        String note,
        ZonedDateTime createdAt,
        List<ItemDetail> items
    ) {}

    // 정산 항목 상세
    public record ItemDetail(
        Long settlementItemId,
        String paymentId,
        String orderId,
        String memberName,
        String planName,
        int amount,
        SettlementItemType itemType,
        ZonedDateTime paymentApprovedAt
    ) {}

    // 정산 리포트 생성 결과
    public record ResponseGenerate(
        Long settlementId,
        LocalDate periodStart,
        LocalDate periodEnd,
        int totalSalesAmount,
        int totalRefundAmount,
        int netSalesAmount,
        int totalTransactionCount,
        SettlementStatus settlementStatus
    ) {}

    // 정산 확정 결과
    public record ResponseConfirm(
        Long settlementId,
        SettlementStatus settlementStatus,
        ZonedDateTime settledAt
    ) {}

    // 정산 리포트 생성 요청
    public record RequestGenerate(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd
    ) {}

    // 정산 확정 요청
    public record RequestConfirm(
        String note
    ) {}
}
```

---

## API 명세

### 정산 리포트 목록 조회

```http
GET /api/v1/admin/settlements?status=&page=1&size=20
    → ApiResponse<PaginationResponse<SettlementDTO.ResponseList>>
```

### 정산 리포트 상세 조회

```http
GET /api/v1/admin/settlements/{settlementId}
    → ApiResponse<SettlementDTO.ResponseDetail>
```

### 정산 리포트 생성 (집계)

```http
POST /api/v1/admin/settlements/generate
    Body: { periodStart: "2026-06-01", periodEnd: "2026-06-30" }
    → ApiResponse<SettlementDTO.ResponseGenerate>
```

### 정산 확정

```http
PATCH /api/v1/admin/settlements/{settlementId}/confirm
    Body: { note: "6월 정산 확정" }  (선택)
    → ApiResponse<SettlementDTO.ResponseConfirm>
```

---

## 서비스 로직

### AdminSettlementService

#### getSettlements(status, page, size)
- `status` null이면 전체
- 기본 정렬: `settlement_period_start DESC`
- page 1-based → 0-based 변환
- `@Transactional(readOnly = true)`

#### getSettlementDetail(Long settlementId)
- `SETTLEMENT_NOT_FOUND(404)` 예외 처리
- `settlement_items` JOIN `payments` → 항목 상세 포함
- `settled_by` JOIN `admins` → 확정 관리자 이름 포함
- `@Transactional(readOnly = true)`

#### generateSettlement(RequestGenerate dto, Long adminId, String ipAddress)
- `periodStart >= periodEnd` → `INVALID_PERIOD(400)` 예외
- 동일 기간 리포트 존재 시 → `DUPLICATE_PERIOD(409)` 예외
- 집계 로직:
  1. `payments` 테이블에서 해당 기간 `PAID` 건 조회 → `total_sales_amount`, `paid_count`
  2. `refunds` 테이블에서 해당 기간 `COMPLETED` 건 조회 → `total_refund_amount`, `refund_count`
  3. `net_sales_amount = total_sales_amount - total_refund_amount`
  4. `supply_amount = net_sales_amount * 10 / 11` (원 단위 절사)
  5. `vat_amount = net_sales_amount - supply_amount`
  6. `total_transaction_count = paid_count + refund_count`
- `settlement_items` 생성: 각 결제/환불 건을 `PAYMENT` / `REFUND` item_type으로 매핑
- 감사 로그: `GENERATE_SETTLEMENT` 기록
- `@Transactional`

#### confirmSettlement(Long settlementId, RequestConfirm dto, Long adminId, String ipAddress)
- `SETTLEMENT_NOT_FOUND(404)` 예외 처리
- `settlement_status != PENDING` → `ALREADY_CONFIRMED(409)` 예외
- `settlement_status = CONFIRMED`, `settled_at = now()`, `settled_by = adminId`, `note` 저장
- 감사 로그: `CONFIRM_SETTLEMENT` 기록
- `@Transactional`

---

## User Stories

### Story 1 — 정산 리포트 목록 조회 (P1)

**As** 관리자
**I want** 정산 리포트 목록을 상태별로 필터링하여 조회하고 싶다
**So that** 미확정 정산 건을 빠르게 파악할 수 있다

**Scenario 1**: 전체 조회
- Given 정산 리포트가 존재할 때
- When GET /api/v1/admin/settlements 요청 시
- Then 전체 목록을 settlement_period_start DESC 순으로 반환한다

**Scenario 2**: PENDING 상태 필터
- Given status=PENDING으로 요청 시
- When GET /api/v1/admin/settlements?status=PENDING 요청 시
- Then settlement_status = PENDING인 리포트만 반환한다

---

### Story 2 — 정산 리포트 상세 조회 (P1)

**As** 관리자
**I want** 정산 리포트의 상세 금액과 포함된 결제 내역을 확인하고 싶다
**So that** 정산 금액의 정확성을 검증할 수 있다

**Scenario 1**: 정상 조회
- Given 유효한 settlementId로 요청 시
- When GET /api/v1/admin/settlements/{settlementId} 요청 시
- Then 정산 요약 + 포함 결제/환불 항목 목록을 반환한다

**Scenario 2**: 정산 없음
- Given 존재하지 않는 settlementId로 요청 시
- When GET /api/v1/admin/settlements/{settlementId} 요청 시
- Then 404 SETTLEMENT_NOT_FOUND를 반환한다

---

### Story 3 — 정산 리포트 생성 (P1)

**As** 관리자
**I want** 특정 기간의 결제/환불 데이터를 집계하여 정산 리포트를 생성하고 싶다
**So that** 월별 매출·환불·순매출·VAT를 한눈에 파악할 수 있다

**Scenario 1**: 정상 생성
- Given 2026-06-01 ~ 2026-06-30 기간으로 요청 시
- When POST /api/v1/admin/settlements/generate 요청 시
- Then 해당 기간 payments/refunds를 집계하여 PENDING 상태의 리포트를 생성한다

**Scenario 2**: 동일 기간 중복
- Given 이미 2026-06-01 ~ 2026-06-30 리포트가 존재할 때
- When POST /api/v1/admin/settlements/generate 요청 시
- Then 409 DUPLICATE_PERIOD를 반환한다

**Scenario 3**: 잘못된 기간
- Given periodStart >= periodEnd로 요청 시
- When POST /api/v1/admin/settlements/generate 요청 시
- Then 400 INVALID_PERIOD를 반환한다

---

### Story 4 — 정산 확정 (P1)

**As** 관리자
**I want** 검증이 완료된 정산 리포트를 확정하고 싶다
**So that** 정산이 최종 처리된 상태로 기록된다

**Scenario 1**: 정상 확정
- Given PENDING 상태의 정산 리포트에 대해
- When PATCH /api/v1/admin/settlements/{settlementId}/confirm 요청 시
- Then settlement_status = CONFIRMED, settled_at, settled_by가 저장된다

**Scenario 2**: 이미 확정된 리포트
- Given CONFIRMED 상태의 정산 리포트에 대해
- When PATCH /api/v1/admin/settlements/{settlementId}/confirm 요청 시
- Then 409 ALREADY_CONFIRMED를 반환한다

---

## Functional Requirements

- FR-001: 정산 목록은 settlement_period_start DESC로 정렬되어야 한다
- FR-002: 정산 목록 status 필터가 null이면 전체를 반환해야 한다
- FR-003: 정산 상세에 settlement_items → payments JOIN으로 결제 항목 상세를 포함해야 한다
- FR-004: 정산 생성 시 동일 기간(periodStart, periodEnd) 중복이면 409를 반환해야 한다
- FR-005: 정산 생성 시 periodStart >= periodEnd이면 400을 반환해야 한다
- FR-006: VAT 계산은 `supply_amount = net_sales_amount * 10 / 11` (원 단위 절사)이어야 한다
- FR-007: 정산 확정 시 PENDING이 아니면 409를 반환해야 한다
- FR-008: 정산 생성·확정 시 AuditLog에 감사 로그를 기록해야 한다
- FR-009: page는 1-based로 받아 Service에서 0-based로 변환해야 한다
- FR-010: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다
- FR-011: 모든 API 경로는 /api/v1/admin/ prefix를 사용해야 한다

---

## Edge Cases

- EC-001: 정산 기간 내 결제/환불 데이터가 없는 경우 → 모든 금액 0, 빈 items로 리포트 생성
- EC-002: 동일 기간 정산 리포트 중복 생성 시도 → 409 DUPLICATE_PERIOD
- EC-003: periodStart >= periodEnd → 400 INVALID_PERIOD
- EC-004: CONFIRMED 상태 리포트에 재확정 시도 → 409 ALREADY_CONFIRMED
- EC-005: 존재하지 않는 settlementId 조회/확정 → 404 SETTLEMENT_NOT_FOUND
- EC-006: 정산 상세 조회 시 items가 수백 건 이상 → 페이지네이션 없이 전체 반환 (v1)

---

## Success Criteria

- SC-001: 정산 생성 시 payments/refunds 집계 금액과 settlement_items 합산이 일치한다
- SC-002: VAT 계산이 `net_sales_amount * 10 / 11` (원 단위 절사)로 정확하다
- SC-003: 동일 기간 중복 생성 시 409가 반환된다
- SC-004: CONFIRMED 리포트 재확정 시 409가 반환된다
- SC-005: 정산 생성·확정 시 감사 로그가 기록된다
- SC-006: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| SETTLEMENT_NOT_FOUND | 404 | 정산 리포트 조회/확정 실패 |
| DUPLICATE_PERIOD | 409 | 동일 기간 정산 리포트 중복 생성 |
| INVALID_PERIOD | 400 | periodStart >= periodEnd |
| ALREADY_CONFIRMED | 409 | 이미 확정된 리포트 재확정 시도 |
| UNAUTHORIZED | 401 | 인증 실패 |
