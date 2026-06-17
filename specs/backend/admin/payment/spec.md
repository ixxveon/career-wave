# Spec: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-api`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

Toss Payments PG 연동 기반의 프리미엄 구독 결제 내역 조회 및 CS 관리자 환불 처리 REST API.
`payments` 테이블은 Toss 결제 상태를 관리하고, `refunds` 테이블은 환불 요청·처리 라이프사이클을 분리 관리한다.
`subscriptions` 테이블은 구독 현황 조회를 담당하며, 구독 생성·갱신은 user-backend 담당.

- 정산 리포트 API는 v2 예정
- 멘토 정산 기능 없음 (CareerWave는 멘토 서비스 미제공)

---

## ERD

### payments (init.sql 기준)

```sql
payment_id      UUID            PK DEFAULT gen_random_uuid()
member_id       UUID            FK NOT NULL  REFERENCES members(member_id)
subscription_id UUID            FK NULL      REFERENCES subscriptions(subscription_id)
plan_id         BIGINT          FK NOT NULL  REFERENCES plans(plan_id)
order_id        VARCHAR(100)    NOT NULL UNIQUE
payment_key     VARCHAR(200)    NULL UNIQUE               -- Toss 결제 키 (FAILED 시 NULL)
idempotency_key VARCHAR(100)    NOT NULL UNIQUE           -- 중복 결제 방지 키
amount          INT             NOT NULL                  -- 최종 결제 금액 (부가세 포함)
currency        VARCHAR(10)     NOT NULL DEFAULT 'KRW'
payment_status  VARCHAR(20)     NOT NULL DEFAULT 'READY'
                CHECK IN ('READY', 'CONFIRMING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED')
failure_reason  VARCHAR(30)     NULL
                CHECK IN ('USER_CANCELED', 'CARD_DECLINED', 'TIMEOUT', 'DUPLICATE_ORDER', 'CONFIRM_FAILED', 'FORBIDDEN', 'UNKNOWN')
payment_method  VARCHAR(30)     NULL
approved_at     TIMESTAMPTZ     NULL    -- PAID 상태일 때 반드시 값 존재, 그 외(READY/CONFIRMING/FAILED/CANCELED/REFUNDED)는 NULL
created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
```

**payment_status 상태 흐름**:
- `READY` → `CONFIRMING` → `PAID` : 정상 결제
- `READY` / `CONFIRMING` → `FAILED` : 결제 실패
- `PAID` → `CANCELED` : 환불 처리 완료
- `PAID` → `REFUNDED` : 자동 환불 처리

### refunds (init.sql 기준)

```sql
refund_id     BIGSERIAL       PK
payment_id    UUID            FK NOT NULL  REFERENCES payments(payment_id)
admin_id      BIGINT          FK NULL      REFERENCES admins(admin_id)  -- 자동 환불 시 NULL
amount        INT             NOT NULL
reason        TEXT            NOT NULL
refund_status VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
              CHECK IN ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED')
reject_reason TEXT            NULL
refunded_at   TIMESTAMPTZ     NULL

CONSTRAINT chk_reject_reason  CHECK (refund_status != 'REJECTED'  OR reject_reason IS NOT NULL)
CONSTRAINT chk_refunded_at    CHECK (refund_status != 'COMPLETED' OR refunded_at   IS NOT NULL)

created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
```

### subscriptions (조회 전용 — 생성·갱신은 user-backend 담당)

```sql
subscription_id      UUID        PK DEFAULT gen_random_uuid()
member_id            UUID        FK NOT NULL  REFERENCES members(member_id)
plan_id              BIGINT      FK NOT NULL  REFERENCES plans(plan_id)
subscription_status  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                     CHECK IN ('ACTIVE', 'CANCEL_SCHEDULED', 'EXPIRED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED')
started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
current_period_start TIMESTAMPTZ NOT NULL
current_period_end   TIMESTAMPTZ NOT NULL
next_billing_at      TIMESTAMPTZ NULL
cancel_scheduled_at  TIMESTAMPTZ NULL
cancelled_at         TIMESTAMPTZ NULL
auto_renew           BOOLEAN     NOT NULL DEFAULT TRUE
created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### plans (참조용)

```sql
plan_id       BIGSERIAL   PK
product_code  VARCHAR(30) NOT NULL UNIQUE
plan_name     VARCHAR(50) NOT NULL
plan_price    INT         NOT NULL
currency      VARCHAR(10) NOT NULL DEFAULT 'KRW'
billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
is_active     BOOLEAN     NOT NULL DEFAULT TRUE
created_at    TIMESTAMPTZ NOT NULL
```

---

## 패키지 구조

```text
admin/payment/
├── entity/
│   ├── Payment.java
│   └── Refund.java
├── repository/
│   ├── PaymentRepository.java
│   ├── PaymentQueryRepository.java
│   ├── RefundRepository.java
│   └── SubscriptionQueryRepository.java    -- admin 전용 (조회 전용)
├── type/
│   ├── PaymentStatus.java                  -- READY/CONFIRMING/PAID/FAILED/CANCELED/REFUNDED
│   ├── FailureReason.java                  -- USER_CANCELED/CARD_DECLINED/TIMEOUT 등 7종
│   ├── RefundStatus.java                   -- PENDING/COMPLETED/FAILED/REJECTED
│   └── SubscriptionStatus.java            -- ACTIVE/CANCEL_SCHEDULED/EXPIRED/PAYMENT_FAILED/REFUND_PENDING/REFUNDED
├── service/
│   ├── AdminPaymentService.java
│   ├── AdminSubscriptionService.java
│   └── impl/
│       ├── AdminPaymentServiceImpl.java
│       └── AdminSubscriptionServiceImpl.java
├── controller/
│   ├── AdminPaymentController.java
│   └── AdminSubscriptionController.java
├── dto/
│   ├── PaymentDTO.java
│   ├── RefundDTO.java
│   └── SubscriptionDTO.java
├── exception/
│   └── AdminPaymentErrorCode.java
└── docs/
    ├── AdminPaymentControllerDocs.java
    └── AdminSubscriptionControllerDocs.java
```

---

## DTO 구조

### PaymentDTO.java

```java
public class PaymentDTO {

    // 결제 목록 항목
    public record ResponseList(
        String paymentId,
        String orderId,
        String memberName,
        String planName,
        ZonedDateTime approvedAt,
        int amount,
        PaymentStatus paymentStatus,
        RefundStatus refundStatus     // refunds LEFT JOIN, 없으면 null
    ) {}

    // 결제 상세
    public record ResponseDetail(
        String paymentId,
        String orderId,
        String memberName,
        String memberEmail,
        String planName,
        ZonedDateTime approvedAt,
        int amount,
        PaymentStatus paymentStatus,
        String paymentMethod,
        RefundStatus refundStatus,
        AiUsage aiUsage
    ) {
        public record AiUsage(int documentCount, int interviewCount) {}
    }

    // KPI 집계
    public record ResponseSummary(
        long totalRevenue,
        long paidCount,
        long refundPendingCount,
        long failedCount
    ) {}
}
```

### RefundDTO.java

```java
public class RefundDTO {

    public record ResponseApprove(
        String paymentId,
        PaymentStatus paymentStatus,
        RefundStatus refundStatus
    ) {}

    public record ResponseReject(
        String paymentId,
        PaymentStatus paymentStatus,
        RefundStatus refundStatus
    ) {}
}
```

### SubscriptionDTO.java

```java
public class SubscriptionDTO {

    public record ResponseList(
        String subscriptionId,
        String memberName,
        String planName,
        ZonedDateTime startedAt,
        ZonedDateTime currentPeriodEnd,
        SubscriptionStatus subscriptionStatus,
        boolean autoRenew
    ) {}

    public record ResponseSummary(
        long activeCount,
        long cancelScheduledCount,
        long paymentFailedCount,
        long expiredCount
    ) {}
}
```

---

## API 명세

### KPI 집계

```http
GET /api/v1/admin/payments/summary
응답: ApiResponse<PaymentDTO.ResponseSummary>
```

### 결제 내역

```http
GET  /api/v1/admin/payments?keyword=&status=&page=1&size=20
       → ApiResponse<PaginationResponse<PaymentDTO.ResponseList>>

GET  /api/v1/admin/payments/{paymentId}
       → ApiResponse<PaymentDTO.ResponseDetail>

POST /api/v1/admin/payments/{paymentId}/refund
       → ApiResponse<RefundDTO.ResponseApprove>

POST /api/v1/admin/payments/{paymentId}/refund-reject
       Body: { rejectReason: string }
       → ApiResponse<RefundDTO.ResponseReject>
```

### 구독 현황

```http
GET /api/v1/admin/subscriptions?status=&page=1&size=20
      → ApiResponse<PaginationResponse<SubscriptionDTO.ResponseList>>
```

---

## 서비스 로직

### AdminPaymentService

#### getSummary()
- `payment_status = PAID` 건 COUNT & SUM → `totalRevenue`, `paidCount`
- `refund_status = PENDING` 건 COUNT → `refundPendingCount`
- `payment_status = FAILED` 건 COUNT → `failedCount`
- `@Transactional(readOnly = true)`

#### getPayments(keyword, status, page, size)
- `keyword`: order_id, payment_id, member name LIKE 검색
- `status` null이면 전체
- `refunds` LEFT JOIN → `refundStatus` 포함
- 기본 정렬: `created_at DESC`
- page 1-based → 0-based 변환
- `@Transactional(readOnly = true)`

#### getPaymentDetail(UUID paymentId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- AI 이용 현황: `ai_usage_logs` 테이블에서 해당 회원의 `feature_type`별 COUNT
- `@Transactional(readOnly = true)`

#### approveRefund(UUID paymentId, Long adminId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
- `payment_status != PAID` → `PAYMENT_NOT_REFUNDABLE(409)` 예외
- Toss 환불 API 호출 (`POST /v1/payments/{paymentKey}/cancel`)
  - 성공: `refund_status = COMPLETED`, `payment_status = CANCELED` — 동일 트랜잭션
  - 실패: `refund_status = FAILED` — 별도 트랜잭션(`REQUIRES_NEW`) 후 `TOSS_REFUND_FAILED(502)` throw
- `@Transactional`

#### rejectRefund(UUID paymentId, String rejectReason, Long adminId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
- `rejectReason` blank → `REJECT_REASON_REQUIRED(400)` 예외
- `refund_status = REJECTED`, `reject_reason` 저장
- `@Transactional`

### AdminSubscriptionService

#### getSubscriptions(status, page, size)
- `status` null이면 전체
- `PAYMENT_FAILED` 필터: `subscription_status = PAYMENT_FAILED`인 건 조회
- 기본 정렬: `created_at DESC`
- `@Transactional(readOnly = true)`

---

## User Stories

### Story 1 — 결제 현황 KPI 조회 (P1)

**As** 관리자
**I want** 전체 결제 매출과 환불 대기 건수를 한눈에 보고 싶다
**So that** 결제·환불 현황을 빠르게 파악할 수 있다

**Scenario 1**: 정상 조회
- Given 결제 데이터가 존재할 때
- When GET /api/v1/admin/payments/summary 요청 시
- Then totalRevenue, paidCount, refundPendingCount, failedCount를 반환한다

**Scenario 2**: 데이터 없음
- Given 결제 데이터가 하나도 없을 때
- When GET /api/v1/admin/payments/summary 요청 시
- Then 모든 값을 0으로 반환한다

---

### Story 2 — 결제 목록 조회 (P1)

**As** 관리자
**I want** 결제 내역을 키워드와 상태로 필터링하여 조회하고 싶다
**So that** 특정 회원이나 주문의 결제 내역을 빠르게 찾을 수 있다

**Scenario 1**: 필터 없이 전체 조회
- Given 결제 데이터가 존재할 때
- When GET /api/v1/admin/payments 요청 시
- Then 전체 결제 목록을 created_at DESC 순으로 반환한다

**Scenario 2**: PAID 상태 필터
- Given status=PAID로 요청 시
- When GET /api/v1/admin/payments?status=PAID 요청 시
- Then payment_status = PAID인 결제만 반환한다

---

### Story 3 — 결제 상세 조회 (P1)

**As** 관리자
**I want** 결제 건의 상세 내용과 해당 회원의 AI 이용 현황을 확인하고 싶다
**So that** 환불 처리 여부를 판단할 수 있다

**Scenario 1**: 정상 조회
- Given 유효한 paymentId로 요청 시
- When GET /api/v1/admin/payments/{paymentId} 요청 시
- Then 결제 상세와 AI 이용 현황(documentCount, interviewCount)을 반환한다

**Scenario 2**: 결제 없음
- Given 존재하지 않는 paymentId로 요청 시
- When GET /api/v1/admin/payments/{paymentId} 요청 시
- Then 404 PAYMENT_NOT_FOUND를 반환한다

---

### Story 4 — 환불 처리 확정 (P1)

**As** 관리자
**I want** 환불 요청 건을 승인하여 Toss 환불 API를 통해 환불을 진행하고 싶다
**So that** 회원의 환불 요청을 처리할 수 있다

**Scenario 1**: 정상 환불 확정
- Given PENDING 상태의 환불 요청이 있는 PAID 결제에 대해
- When POST /api/v1/admin/payments/{paymentId}/refund 요청 시
- Then Toss 환불 API가 호출되고 refund_status = COMPLETED, payment_status = CANCELED로 동일 트랜잭션 처리 후 결과를 반환한다

**Scenario 2**: Toss API 실패
- Given Toss 환불 API 호출이 실패한 경우
- When POST /api/v1/admin/payments/{paymentId}/refund 요청 시
- Then refund_status = FAILED가 별도 트랜잭션으로 저장되고 502 TOSS_REFUND_FAILED를 반환한다

**Scenario 3**: 이미 처리된 환불
- Given PENDING이 아닌 환불 요청에 대해
- When POST /api/v1/admin/payments/{paymentId}/refund 요청 시
- Then 409 REFUND_NOT_PENDING을 반환한다

**Scenario 4**: PAID 아닌 결제 환불 시도
- Given payment_status = FAILED인 결제에 대해
- When POST /api/v1/admin/payments/{paymentId}/refund 요청 시
- Then 409 PAYMENT_NOT_REFUNDABLE을 반환한다

---

### Story 5 — 환불 불가 처리 (P1)

**As** 관리자
**I want** 이용 약관 위반 등 사유로 환불을 거부하고 싶다
**So that** 부당한 환불 요청을 막을 수 있다

**Scenario 1**: 정상 불가 처리
- Given PENDING 상태의 환불 요청에 대해 rejectReason 포함하여 요청 시
- When POST /api/v1/admin/payments/{paymentId}/refund-reject 요청 시
- Then refund_status = REJECTED, reject_reason 저장 후 결과를 반환한다

**Scenario 2**: 사유 미입력
- Given rejectReason이 blank인 경우
- When POST /api/v1/admin/payments/{paymentId}/refund-reject 요청 시
- Then 400 REJECT_REASON_REQUIRED를 반환한다

---

### Story 6 — 구독 현황 조회 (P2)

**As** 관리자
**I want** 구독 상태별로 회원의 구독 현황을 조회하고 싶다
**So that** 결제 실패 구독자를 파악하고 대응할 수 있다

**Scenario 1**: 전체 조회
- Given 구독 데이터가 존재할 때
- When GET /api/v1/admin/subscriptions 요청 시
- Then 전체 구독 목록을 created_at DESC 순으로 반환한다

**Scenario 2**: PAYMENT_FAILED 필터
- Given status=PAYMENT_FAILED로 요청 시
- When GET /api/v1/admin/subscriptions?status=PAYMENT_FAILED 요청 시
- Then subscription_status = PAYMENT_FAILED인 구독만 반환한다

---

## Functional Requirements

- FR-001: KPI API는 totalRevenue(PAID 합산), paidCount, refundPendingCount, failedCount를 반환해야 한다
- FR-002: 결제 목록 keyword 필터는 order_id, payment_id, member name에 LIKE 검색을 수행해야 한다
- FR-003: 결제 목록 status 필터가 null이면 전체를 반환해야 한다
- FR-004: 결제 목록에 refunds LEFT JOIN하여 refundStatus를 포함해야 한다
- FR-005: 결제 목록과 구독 목록의 기본 정렬은 created_at DESC이어야 한다
- FR-006: page는 1-based로 받아 Service에서 0-based로 변환해야 한다
- FR-007: 결제 상세 AI 이용 현황은 ai_usage_logs에서 feature_type별 COUNT로 집계해야 한다
- FR-008: PENDING이 아닌 환불 처리 시도 시 409 REFUND_NOT_PENDING을 반환해야 한다
- FR-009: PAID 아닌 결제 환불 시도 시 409 PAYMENT_NOT_REFUNDABLE을 반환해야 한다
- FR-010: 환불 확정 시 Toss 환불 API 성공 후 refund_status = COMPLETED, payment_status = CANCELED가 동일 트랜잭션에서 실행되어야 한다
- FR-011: Toss 환불 API 실패 시 refund_status = FAILED는 별도 트랜잭션(REQUIRES_NEW)으로 저장되어야 한다
- FR-012: 환불 불가 처리 시 rejectReason이 blank이면 400 REJECT_REASON_REQUIRED를 반환해야 한다
- FR-013: subscriptions 테이블 쓰기 작업은 admin 패키지에서 수행하지 않아야 한다 (user-backend 담당)
- FR-014: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다
- FR-015: 모든 API 경로는 /api/v1/admin/ prefix를 사용해야 한다

---

## Edge Cases

- EC-001: PENDING이 아닌 환불에 환불 확정 시도 → 409 REFUND_NOT_PENDING
- EC-002: PENDING이 아닌 환불에 환불 불가 시도 → 409 REFUND_NOT_PENDING
- EC-003: PAID 아닌 결제(FAILED, CANCELED 등)에 환불 시도 → 409 PAYMENT_NOT_REFUNDABLE
- EC-004: Toss 환불 API 실패 → refund_status = FAILED 별도 트랜잭션 저장 후 502 반환
- EC-005: paymentKey가 NULL인 FAILED 결제의 환불 시도 → 409 PAYMENT_NOT_REFUNDABLE
- EC-006: AI 이용 현황 테이블에 해당 회원 데이터 없음 → COUNT 0으로 반환
- EC-007: 존재하지 않는 paymentId로 결제 상세 조회 → 404 PAYMENT_NOT_FOUND

---

## Success Criteria

- SC-001: Toss 환불 API 성공 시 refund_status = COMPLETED, payment_status = CANCELED가 동일 트랜잭션에서 변경된다
- SC-002: Toss 환불 API 실패 시 refund_status = FAILED가 별도 트랜잭션으로 저장되고 502가 반환된다
- SC-003: PENDING 아닌 환불 처리 시도 시 409가 반환된다
- SC-004: PAID 아닌 결제 환불 시도 시 409가 반환된다
- SC-005: 환불 불가 rejectReason blank 시 400이 반환된다
- SC-006: 결제 상세 응답에 AI 이용 현황(documentCount, interviewCount)이 포함된다
- SC-007: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| PAYMENT_NOT_FOUND | 404 | 결제 건 조회 실패 |
| REFUND_NOT_PENDING | 409 | 이미 처리된 환불 건 재처리 시도 |
| PAYMENT_NOT_REFUNDABLE | 409 | PAID 아닌 결제 환불 시도 |
| REJECT_REASON_REQUIRED | 400 | 환불 불가 처리 시 사유 미입력 |
| TOSS_REFUND_FAILED | 502 | Toss 환불 API 호출 실패 |
| UNAUTHORIZED | 401 | 인증 실패 |