package kr.co.carrer.user.billing.entity;

import jakarta.persistence.*;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.type.UserPaymentType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

// admin.payment.entity.Payment 와 동일한 payments 테이블 공유
// 컬럼명·enum 값은 admin 엔티티와 1:1 정렬 — constitution §8.1 §8.2 준수
// admin 패키지를 직접 import 하지 않음
@Entity
@Table(name = "payments",
    indexes = {
        @Index(name = "idx_payments_status_expires", columnList = "payment_status, expires_at")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_payments_idempotency_key", columnNames = "idempotency_key")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPayment {

    @Id
    @Column(name = "payment_id", columnDefinition = "uuid", updatable = false)
    private UUID paymentId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "subscription_id", columnDefinition = "uuid")
    private UUID subscriptionId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "order_id", nullable = false, length = 100)
    private String orderId;

    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "customer_key", nullable = false, length = 100)
    private String customerKey;

    @Column(name = "customer_name", nullable = false, length = 100)
    private String customerName;

    @Column(name = "customer_email", nullable = false, length = 200)
    private String customerEmail;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private UserPaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_reason", length = 30)
    private PaymentFailureReason failureReason;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private UserPaymentType paymentType;

    @Column(name = "attempt_sequence", nullable = false)
    private int attemptSequence;

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    @Column(name = "expires_at")
    private ZonedDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @PrePersist
    protected void onCreate() {
        if (paymentId == null) paymentId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now(KST);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now(KST);
    }

    // ── 팩토리 ──────────────────────────────────────────────────────────────

    // AUTO_RENEWAL: READY/AUTHORIZED 단계 없이 CONFIRMING에서 시작 — billingKey 이미 보유
    public static UserPayment createAutoRenewal(UUID memberId, Long planId, String productCode,
                                                String orderId, String idempotencyKey,
                                                String customerKey, String customerName, String customerEmail,
                                                int amount, int attemptSequence) {
        UserPayment p = new UserPayment();
        p.memberId = memberId;
        p.planId = planId;
        p.productCode = productCode;
        p.orderId = orderId;
        p.idempotencyKey = idempotencyKey;
        p.customerKey = customerKey;
        p.customerName = customerName;
        p.customerEmail = customerEmail;
        p.amount = amount;
        p.currency = "KRW";
        p.paymentStatus = UserPaymentStatus.CONFIRMING;
        p.paymentType = UserPaymentType.AUTO_RENEWAL;
        p.attemptSequence = attemptSequence;
        return p;
    }

    public static UserPayment createReady(UUID memberId, Long planId, String productCode,
                                          String orderId, String idempotencyKey,
                                          String customerKey, String customerName, String customerEmail,
                                          int amount, ZonedDateTime expiresAt) {
        UserPayment p = new UserPayment();
        p.memberId = memberId;
        p.planId = planId;
        p.productCode = productCode;
        p.orderId = orderId;
        p.idempotencyKey = idempotencyKey;
        p.customerKey = customerKey;
        p.customerName = customerName;
        p.customerEmail = customerEmail;
        p.amount = amount;
        p.currency = "KRW";
        p.paymentStatus = UserPaymentStatus.READY;
        p.paymentType = UserPaymentType.MANUAL;
        p.attemptSequence = 0;
        p.expiresAt = expiresAt;
        return p;
    }

    @Column(name = "reconciling_at")
    private ZonedDateTime reconcilingAt;

    // ── 상태 전이 — user 측 책임 범위만 구현 (constitution §8.3) ────────────
    // READY → AUTHORIZED → CONFIRMING → PAID
    // READY → RECONCILING (결제 결과 미확정 — Toss timeout/5xx 시)
    // READY → CANCELED (만료 스케줄러)
    // AUTHORIZED / CONFIRMING / RECONCILING → FAILED

    public void authorize() {
        if (this.paymentStatus != UserPaymentStatus.READY) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.AUTHORIZED;
    }

    public void confirmStarted() {
        if (this.paymentStatus != UserPaymentStatus.AUTHORIZED) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.CONFIRMING;
    }

    public void paid(String paymentKey, ZonedDateTime approvedAt) {
        if (this.paymentStatus != UserPaymentStatus.CONFIRMING
                && this.paymentStatus != UserPaymentStatus.RECONCILING) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.PAID;
        this.paymentKey = paymentKey;
        this.approvedAt = approvedAt;
    }

    public void fail(PaymentFailureReason reason) {
        if (this.paymentStatus != UserPaymentStatus.AUTHORIZED
                && this.paymentStatus != UserPaymentStatus.CONFIRMING
                && this.paymentStatus != UserPaymentStatus.RECONCILING) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.FAILED;
        this.failureReason = reason;
    }

    // READY → RECONCILING: Toss 결제 호출 결과가 불확실할 때 (timeout/5xx)
    // RECONCILING 상태에서 대사 스케줄러가 Toss에 재조회하여 PAID 또는 FAILED로 확정
    public void markForReconciliation() {
        if (this.paymentStatus != UserPaymentStatus.READY) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.RECONCILING;
        this.reconcilingAt = ZonedDateTime.now(KST);
    }

    public void cancel() {
        if (this.paymentStatus != UserPaymentStatus.READY) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        this.paymentStatus = UserPaymentStatus.CANCELED;
    }

    public void linkSubscription(UUID subscriptionId) {
        this.subscriptionId = subscriptionId;
    }
}
