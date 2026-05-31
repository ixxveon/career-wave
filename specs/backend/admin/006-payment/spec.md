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
amount          INT             NOT NULL
supply_amount   INT             NOT NULL                  -- 공급가액 (정산 리포트 v2용)
vat             INT             NOT NULL                  -- 부가세 (정산 리포트 v2용)
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
amount        INT             NOT NULL
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

    // 환불 처리 확정 시 상태 전이
    public void cancel() {
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

    // 환불 처리 확정
    public void complete(Long adminId) {
        this.refundStatus = RefundStatus.COMPLETED;
        this.adminId = adminId;
        this.refundedAt = ZonedDateTime.now();
    }

    // 환불 불가 처리
    public void reject(Long adminId, String rejectReason) {
        this.refundStatus = RefundStatus.REJECTED;
        this.adminId = adminId;
        this.rejectReason = rejectReason;
    }

    // Toss API 실패
    public void fail() {
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
  - 성공: `refund.complete(adminId)`, `payment.cancel()` — `@Transactional`
  - 실패: `refund.fail()` — `TOSS_REFUND_FAILED(502)` 예외
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
