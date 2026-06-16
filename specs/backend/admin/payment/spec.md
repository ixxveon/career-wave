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

- 정산 리포트 API는 v2 예정 (`supply_amount`, `vat` 컬럼은 미리 저장)
- 멘토 정산 기능 없음 (CareerWave는 멘토 서비스 미제공)

---

## ERD

### payments
```sql
payment_id      UUID            PK DEFAULT gen_random_uuid()
member_id       UUID            FK NOT NULL  REFERENCES members(member_id)
plan_id         BIGINT          FK NOT NULL  REFERENCES plans(plan_id)
buyer_name      VARCHAR         NOT NULL                  -- 결제 시점 이름 스냅샷
buyer_email     VARCHAR         NOT NULL                  -- 결제 시점 이메일 스냅샷
payment_key     VARCHAR         NULL UNIQUE               -- Toss 결제 키 (FAILED 시 NULL)
order_id        VARCHAR         NOT NULL UNIQUE           -- Toss 주문번호
amount          INT             NOT NULL CHECK (amount > 0)
supply_amount   INT             NOT NULL CHECK (supply_amount >= 0)  -- 공급가액 (정산 리포트 v2용)
vat             INT             NOT NULL CHECK (vat >= 0)            -- 부가세 (정산 리포트 v2용)
payment_status  VARCHAR(20)     NOT NULL
                CHECK (payment_status IN ('PENDING','DONE','CANCELED','FAILED'))
payment_type    VARCHAR(20)     NOT NULL
                CHECK (payment_type IN ('MANUAL','AUTO_RENEWAL'))
payment_method  VARCHAR         NULL
approved_at     TIMESTAMPTZ     NULL
created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
```

**인덱스**:
```sql
CREATE INDEX idx_payments_status     ON payments(payment_status);
CREATE INDEX idx_payments_member     ON payments(member_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
```

### refunds
```sql
refund_id     BIGSERIAL       PK
payment_id    UUID            FK NOT NULL  REFERENCES payments(payment_id)
admin_id      BIGINT          FK NULL      REFERENCES admins(admin_id)  -- PENDING 시 NULL
amount        INT             NOT NULL CHECK (amount > 0)
reason        TEXT            NOT NULL
refund_status VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
              CHECK (refund_status IN ('PENDING','COMPLETED','FAILED','REJECTED'))
reject_reason TEXT            NULL
refunded_at   TIMESTAMPTZ     NULL

CONSTRAINT chk_reject_reason  CHECK (refund_status != 'REJECTED'  OR reject_reason IS NOT NULL)
CONSTRAINT chk_refunded_at    CHECK (refund_status != 'COMPLETED' OR refunded_at   IS NOT NULL)

created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
```

**인덱스**:
```sql
CREATE INDEX idx_refunds_payment    ON refunds(payment_id);
CREATE INDEX idx_refunds_status     ON refunds(refund_status);
```

### subscriptions (조회 전용 — 생성·갱신은 user-backend 담당)
```sql
subscription_id  BIGSERIAL   PK
member_id        UUID        FK NOT NULL  REFERENCES members(member_id)
payment_id       UUID        FK NULL      REFERENCES payments(payment_id)
plan_id          BIGINT      FK NOT NULL  REFERENCES plans(plan_id)
sub_status       VARCHAR(20) NOT NULL
                 CHECK (sub_status IN ('ACTIVE','RENEWAL_SCHEDULED','CANCEL_SCHEDULED','AT_RISK'))
start_date       DATE        NOT NULL
renew_date       DATE        NULL
auto_renew       BOOLEAN     NOT NULL DEFAULT TRUE
created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### plans (참조용)
```sql
plan_id     BIGSERIAL   PK
plan_type   VARCHAR(10) NOT NULL  CHECK (plan_type IN ('FREE','PREMIUM'))
plan_name   VARCHAR(50) NOT NULL
plan_price  INT         NOT NULL
is_active   BOOLEAN     NOT NULL DEFAULT TRUE
created_at  TIMESTAMPTZ NOT NULL
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
│   ├── RefundRepository.java
│   └── SubscriptionRepository.java     -- admin 전용 (조회 전용)
├── type/
│   ├── PaymentStatus.java              -- PENDING/DONE/CANCELED/FAILED
│   ├── PaymentType.java                -- MANUAL/AUTO_RENEWAL
│   ├── RefundStatus.java               -- PENDING/COMPLETED/FAILED/REJECTED
│   └── SubStatus.java                  -- ACTIVE/RENEWAL_SCHEDULED/CANCEL_SCHEDULED/AT_RISK
├── service/
│   ├── AdminPaymentService.java
│   └── AdminSubscriptionService.java
├── controller/
│   ├── AdminPaymentController.java
│   └── AdminSubscriptionController.java
├── dto/
│   ├── PaymentDTO.java
│   ├── RefundDTO.java
│   └── SubscriptionDTO.java
└── docs/
    ├── AdminPaymentControllerDocs.java
    └── AdminSubscriptionControllerDocs.java
```

> `user/` 패키지 클래스를 직접 참조하지 않는다. (CONVENTION.md)
> subscriptions 테이블 조회는 admin 전용 SubscriptionRepository 별도 정의.

---

## Entity

### Payment.java

```java
@Entity
@Table(name = "payments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "payment_id", columnDefinition = "UUID")
    private UUID paymentId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "buyer_name", nullable = false)
    private String buyerName;

    @Column(name = "buyer_email", nullable = false)
    private String buyerEmail;

    @Column(name = "payment_key", unique = true)
    private String paymentKey;          // FAILED 시 NULL

    @Column(name = "order_id", nullable = false, unique = true)
    private String orderId;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "supply_amount", nullable = false)
    private int supplyAmount;

    @Column(name = "vat", nullable = false)
    private int vat;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = ZonedDateTime.now();
    }

    // 환불 처리 확정 시 상태 전이 (DONE 상태에서만 호출 가능 — Service에서 사전 검증)
    public void cancel() {
        if (this.paymentStatus != PaymentStatus.DONE) {
            throw new IllegalStateException("DONE 상태의 결제만 취소할 수 있습니다.");
        }
        this.paymentStatus = PaymentStatus.CANCELED;
    }
}
```

### Refund.java

```java
@Entity
@Table(name = "refunds")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id")
    private Long refundId;

    @Column(name = "payment_id", nullable = false, columnDefinition = "UUID")
    private UUID paymentId;

    @Column(name = "admin_id")
    private Long adminId;               // PENDING 시 NULL

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false, length = 20)
    private RefundStatus refundStatus;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "refunded_at")
    private ZonedDateTime refundedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    private void prePersist() {
        this.refundStatus = RefundStatus.PENDING;
        this.createdAt = ZonedDateTime.now();
    }

    // 환불 처리 확정 (PENDING 상태에서만 호출 가능 — Service에서 사전 검증)
    public void complete(Long adminId) {
        if (this.refundStatus != RefundStatus.PENDING) {
            throw new IllegalStateException("PENDING 상태의 환불만 확정할 수 있습니다.");
        }
        this.refundStatus = RefundStatus.COMPLETED;
        this.adminId = adminId;
        this.refundedAt = ZonedDateTime.now();
    }

    // 환불 불가 처리 (PENDING 상태에서만 호출 가능 — Service에서 사전 검증)
    public void reject(Long adminId, String rejectReason) {
        if (this.refundStatus != RefundStatus.PENDING) {
            throw new IllegalStateException("PENDING 상태의 환불만 불가 처리할 수 있습니다.");
        }
        this.refundStatus = RefundStatus.REJECTED;
        this.adminId = adminId;
        this.rejectReason = rejectReason;
    }

    // Toss API 실패 — PENDING 상태에서만 호출. 트랜잭션 분리 필요(@Transactional(noRollbackFor))
    public void fail() {
        if (this.refundStatus != RefundStatus.PENDING) {
            throw new IllegalStateException("PENDING 상태의 환불만 실패 처리할 수 있습니다.");
        }
        this.refundStatus = RefundStatus.FAILED;
    }
}
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
        String product,
        ZonedDateTime paidAt,
        int amount,
        PaymentStatus paymentStatus,
        PaymentType paymentType,
        RefundStatus refundStatus     // refunds LEFT JOIN, 없으면 null
    ) {}

    // 결제 상세 (aiUsage 포함)
    public record ResponseDetail(
        String paymentId,
        String orderId,
        String memberName,
        String memberEmail,
        String product,
        ZonedDateTime paidAt,
        int amount,
        PaymentStatus paymentStatus,
        PaymentType paymentType,
        String paymentMethod,
        RefundStatus refundStatus,
        AiUsage aiUsage
    ) {
        public record AiUsage(int resumePaidCount, int interviewPaidCount) {}
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

    // 환불 처리 확정 응답
    public record ResponseApprove(
        String paymentId,
        PaymentStatus paymentStatus,
        RefundStatus refundStatus
    ) {}

    // 환불 불가 처리 응답
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

    // 구독 목록 항목
    public record ResponseList(
        Long subscriptionId,
        String memberName,
        String plan,
        LocalDate startDate,
        LocalDate renewDate,
        SubStatus subStatus
    ) {}

    // 구독 KPI 집계
    public record ResponseSummary(
        long activeCount,
        long renewalScheduledCount,
        long cancelScheduledCount,
        long atRiskCount
    ) {}
}
```

---

## API 명세

### KPI 집계

```http
GET /api/admin/payments/summary
응답: ApiResponse<PaymentDTO.ResponseSummary>
```

### 결제 내역

```http
GET  /api/admin/payments?keyword=&status=&page=1&size=20
       → ApiResponse<PaginationResponse<PaymentDTO.ResponseList>>

GET  /api/admin/payments/{paymentId}
       → ApiResponse<PaymentDTO.ResponseDetail>

POST /api/admin/payments/{paymentId}/refund
       → ApiResponse<RefundDTO.ResponseApprove>

POST /api/admin/payments/{paymentId}/refund-reject
       → ApiResponse<RefundDTO.ResponseReject>
```

### 구독 현황

```http
GET /api/admin/subscriptions?status=&page=1&size=20
      → ApiResponse<PaginationResponse<SubscriptionDTO.ResponseList>>
```

---

## 서비스 로직

### AdminPaymentService

#### getSummary()
- `payment_status = DONE` 건 COUNT & SUM → `totalRevenue`, `paidCount`
- `refund_status = PENDING` 건 COUNT → `refundPendingCount`
- `payment_status = FAILED` 건 COUNT → `failedCount`
- 반환: `PaymentDTO.ResponseSummary`

#### getPayments(keyword, status, page, size)
- 동적 필터: `keyword`는 `order_id`, `payment_id`, `buyer_name` LIKE 검색
- `status` null이면 전체
- `refunds` LEFT JOIN → `refundStatus` 포함
- 기본 정렬: `created_at DESC`
- page 1-based → 0-based 변환
- 반환: `PaginationResponse<PaymentDTO.ResponseList>`

#### getPaymentDetail(String paymentId, Long adminId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- AI 이용 현황: `resume_analysis_logs`, `interview_logs` 테이블에서 해당 회원의 유료 이용 COUNT 조회
- 반환: `PaymentDTO.ResponseDetail`

#### approveRefund(String paymentId, Long adminId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
- Toss 환불 API 호출 (`POST /v1/payments/{paymentKey}/cancel`)
  - 성공: `refund.complete(adminId)` + `payment.cancel()` — `@Transactional` (원자적 처리)
  - 실패: `refund.fail()`은 **별도 트랜잭션**으로 실행 — `@Transactional(noRollbackFor = TossRefundException.class)` 또는 `REQUIRES_NEW` 내부 메서드로 분리하여 `FAILED` 상태 저장 보장 후 `TOSS_REFUND_FAILED(502)` 예외 발생
- 반환: `RefundDTO.ResponseApprove`

#### rejectRefund(String paymentId, String rejectReason, Long adminId)
- `PAYMENT_NOT_FOUND(404)` 예외 처리
- `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
- `rejectReason` blank → `REJECT_REASON_REQUIRED(400)` 예외
- `refund.reject(adminId, rejectReason)` 호출 — `@Transactional`
- 반환: `RefundDTO.ResponseReject`

---

### AdminSubscriptionService

#### getSubscriptions(status, page, size)
- `status` null이면 전체
- `AT_RISK` 필터: 서브쿼리로 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED`인 `member_id` 추출
- 기본 정렬: `created_at DESC`
- 반환: `PaginationResponse<SubscriptionDTO.ResponseList>`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `PAYMENT_NOT_FOUND` | 404 | 결제 건 조회 실패 |
| `REFUND_NOT_PENDING` | 409 | 이미 처리된 환불 건 재처리 시도 |
| `REJECT_REASON_REQUIRED` | 400 | 환불 불가 처리 시 사유 미입력 |
| `TOSS_REFUND_FAILED` | 502 | Toss 환불 API 호출 실패 |
| `SUBSCRIPTION_NOT_FOUND` | 404 | 구독 건 조회 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |

---

## User Stories

### Story 1 — 결제 현황 KPI 조회 (P1)

**As** 관리자
**I want** 전체 결제 매출과 환불 대기 건수를 한눈에 보고 싶다
**So that** 결제·환불 현황을 빠르게 파악할 수 있다

**Scenario 1**: 정상 조회
- Given 결제 데이터가 존재할 때
- When GET /api/admin/payments/summary 요청 시
- Then totalRevenue, paidCount, refundPendingCount, failedCount를 반환한다

**Scenario 2**: 데이터 없음
- Given 결제 데이터가 하나도 없을 때
- When GET /api/admin/payments/summary 요청 시
- Then 모든 값을 0으로 반환한다

---

### Story 2 — 결제 목록 조회 (P1)

**As** 관리자
**I want** 결제 내역을 키워드와 상태로 필터링하여 조회하고 싶다
**So that** 특정 회원이나 주문의 결제 내역을 빠르게 찾을 수 있다

**Scenario 1**: 필터 없이 전체 조회
- Given 결제 데이터가 존재할 때
- When GET /api/admin/payments 요청 시
- Then 전체 결제 목록을 created_at DESC 순으로 반환한다

**Scenario 2**: 키워드 필터
- Given keyword=홍길동으로 요청 시
- When GET /api/admin/payments?keyword=홍길동 요청 시
- Then buyer_name에 "홍길동"이 포함된 결제 목록을 반환한다

**Scenario 3**: 상태 필터
- Given status=DONE으로 요청 시
- When GET /api/admin/payments?status=DONE 요청 시
- Then payment_status = DONE인 결제만 반환한다

---

### Story 3 — 결제 상세 조회 (P1)

**As** 관리자
**I want** 결제 건의 상세 내용과 해당 회원의 AI 이용 현황을 확인하고 싶다
**So that** 환불 처리 여부를 판단하는 데 필요한 정보를 얻을 수 있다

**Scenario 1**: 정상 조회
- Given 유효한 paymentId로 요청 시
- When GET /api/admin/payments/{paymentId} 요청 시
- Then 결제 상세와 AI 이용 현황(resumePaidCount, interviewPaidCount)을 반환한다

**Scenario 2**: 결제 없음
- Given 존재하지 않는 paymentId로 요청 시
- When GET /api/admin/payments/{paymentId} 요청 시
- Then 404 PAYMENT_NOT_FOUND를 반환한다

---

### Story 4 — 환불 처리 확정 (P1)

**As** 관리자
**I want** 환불 요청 건을 승인하여 Toss 환불 API를 통해 환불을 진행하고 싶다
**So that** 회원의 환불 요청을 처리할 수 있다

**Scenario 1**: 정상 환불 확정
- Given PENDING 상태의 환불 요청이 있는 DONE 결제에 대해
- When POST /api/admin/payments/{paymentId}/refund 요청 시
- Then Toss 환불 API가 호출되고 refund_status = COMPLETED, payment_status = CANCELED로 원자적 변경 후 결과를 반환한다

**Scenario 2**: Toss API 실패
- Given Toss 환불 API 호출이 실패한 경우
- When POST /api/admin/payments/{paymentId}/refund 요청 시
- Then refund_status = FAILED로 별도 트랜잭션에서 저장되고 502 TOSS_REFUND_FAILED를 반환한다

**Scenario 3**: 이미 처리된 환불
- Given PENDING이 아닌 환불 요청에 대해
- When POST /api/admin/payments/{paymentId}/refund 요청 시
- Then 409 REFUND_NOT_PENDING를 반환한다

---

### Story 5 — 환불 불가 처리 (P1)

**As** 관리자
**I want** 이용 약관 위반 등 사유로 환불을 거부하고 싶다
**So that** 부당한 환불 요청을 막을 수 있다

**Scenario 1**: 정상 불가 처리
- Given PENDING 상태의 환불 요청에 대해 rejectReason 포함하여 요청 시
- When POST /api/admin/payments/{paymentId}/refund-reject 요청 시
- Then refund_status = REJECTED, reject_reason 저장 후 결과를 반환한다

**Scenario 2**: 사유 미입력
- Given rejectReason이 blank인 경우
- When POST /api/admin/payments/{paymentId}/refund-reject 요청 시
- Then 400 REJECT_REASON_REQUIRED를 반환한다

---

### Story 6 — 구독 현황 조회 (P2)

**As** 관리자
**I want** 구독 상태별로 회원의 구독 현황을 조회하고 싶다
**So that** AT_RISK 구독자를 파악하고 대응할 수 있다

**Scenario 1**: 필터 없이 전체 조회
- Given 구독 데이터가 존재할 때
- When GET /api/admin/subscriptions 요청 시
- Then 전체 구독 목록을 created_at DESC 순으로 반환한다

**Scenario 2**: AT_RISK 필터
- Given status=AT_RISK로 요청 시
- When GET /api/admin/subscriptions?status=AT_RISK 요청 시
- Then 가장 최근 AUTO_RENEWAL 결제가 FAILED인 구독만 반환한다

---

## Functional Requirements

- FR-001: KPI API는 totalRevenue(DONE 합산), paidCount, refundPendingCount, failedCount를 반환해야 한다
- FR-002: 결제 목록 keyword 필터는 order_id, payment_id, buyer_name에 LIKE 검색을 수행해야 한다
- FR-003: 결제 목록 status 필터가 null이면 전체를 반환해야 한다
- FR-004: 결제 목록에 refunds LEFT JOIN하여 refundStatus를 포함해야 한다
- FR-005: 결제 목록과 구독 목록의 기본 정렬은 created_at DESC이어야 한다
- FR-006: page는 1-based로 받아 Service에서 0-based로 변환해야 한다
- FR-007: 결제 상세 AI 이용 현황은 resume_analysis_logs, interview_logs에서 유료 건만 COUNT해야 한다
- FR-008: PENDING이 아닌 환불에 환불 확정 또는 불가 처리 시도 시 409 REFUND_NOT_PENDING을 반환해야 한다
- FR-009: 환불 확정 시 Toss 환불 API 성공 후 refund.complete()와 payment.cancel()이 동일 트랜잭션에서 실행되어야 한다
- FR-010: Toss 환불 API 실패 시 refund.fail()은 별도 트랜잭션으로 실행하여 FAILED 상태를 보장해야 한다
- FR-011: 환불 불가 처리 시 rejectReason이 blank이면 400 REJECT_REASON_REQUIRED를 반환해야 한다
- FR-012: 환불 불가 처리 시 refund_status = REJECTED, reject_reason 저장되어야 한다
- FR-013: AT_RISK 구독 필터는 서브쿼리로 최근 AUTO_RENEWAL 결제가 FAILED인 member_id를 추출해야 한다
- FR-014: subscriptions 테이블 쓰기 작업은 admin 패키지에서 수행하지 않아야 한다 (user-backend 담당)
- FR-015: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다

---

## Edge Cases

- EC-001: PENDING이 아닌 환불에 환불 확정 시도 → 409 REFUND_NOT_PENDING
- EC-002: PENDING이 아닌 환불에 환불 불가 시도 → 409 REFUND_NOT_PENDING
- EC-003: 환불 불가 처리 시 rejectReason blank → 400 REJECT_REASON_REQUIRED
- EC-004: Toss 환불 API 실패 → refund.fail() 별도 트랜잭션으로 FAILED 저장 후 502 반환
- EC-005: paymentKey가 NULL인 FAILED 결제의 환불 시도 → 환불 불가 처리 (Toss 호출 불가)
- EC-006: AI 이용 현황 테이블에 해당 회원 데이터 없음 → COUNT 0으로 반환
- EC-007: 존재하지 않는 paymentId로 결제 상세 조회 → 404 PAYMENT_NOT_FOUND

---

## Success Criteria

- SC-001: Toss 환불 API 성공 시 refund_status = COMPLETED, payment_status = CANCELED가 동일 트랜잭션에서 변경된다
- SC-002: Toss 환불 API 실패 시 refund_status = FAILED가 별도 트랜잭션으로 저장되고 502가 반환된다
- SC-003: PENDING이 아닌 환불 처리 시도 시 409가 반환된다
- SC-004: 환불 불가 rejectReason blank 시 400이 반환된다
- SC-005: AT_RISK 필터가 최근 AUTO_RENEWAL FAILED 구독만 반환한다
- SC-006: 결제 상세 응답에 AI 이용 현황(resumePaidCount, interviewPaidCount)이 포함된다
- SC-007: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다
