package kr.co.carrer.admin.payment.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.type.FailureReason;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.PaymentType;
import kr.co.carrer.global.exception.CustomException;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "payments",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_order_id",        columnNames = "order_id"),
        @UniqueConstraint(name = "uq_idempotency_key", columnNames = "idempotency_key")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

    @Id
    @Column(name = "payment_id", columnDefinition = "UUID")
    private UUID paymentId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "subscription_id", columnDefinition = "UUID")
    private UUID subscriptionId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "order_id", nullable = false, length = 100)
    private String orderId;

    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_reason", length = 30)
    private FailureReason failureReason;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

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

    @PrePersist
    protected void onCreate() {
        if (paymentId == null) {
            paymentId = UUID.randomUUID();
        }
        ZonedDateTime now = ZonedDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (paymentType == null) {
            paymentType = PaymentType.MANUAL;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    // ── 팩토리 ──────────────────────────────────────────────────────────────

    public static Payment createReady(UUID memberId, Long planId, UUID subscriptionId,
                                      String orderId, String idempotencyKey,
                                      int amount, String currency,
                                      PaymentType paymentType, int attemptSequence,
                                      ZonedDateTime expiresAt) {
        if (memberId == null) throw new IllegalArgumentException("memberId는 필수입니다");
        if (planId == null) throw new IllegalArgumentException("planId는 필수입니다");
        if (orderId == null || orderId.isBlank()) throw new IllegalArgumentException("orderId는 필수입니다");
        if (idempotencyKey == null || idempotencyKey.isBlank()) throw new IllegalArgumentException("idempotencyKey는 필수입니다");
        if (amount <= 0) throw new IllegalArgumentException("amount는 0보다 커야 합니다: " + amount);
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency는 필수입니다");
        if (paymentType == null) throw new IllegalArgumentException("paymentType은 필수입니다");
        if (attemptSequence < 0 || attemptSequence > 2) throw new IllegalArgumentException("attemptSequence는 0~2 범위여야 합니다: " + attemptSequence);
        if (paymentType == PaymentType.AUTO_RENEWAL && subscriptionId == null) {
            throw new IllegalArgumentException("AUTO_RENEWAL 결제에는 subscriptionId가 필수입니다");
        }

        Payment p = new Payment();
        p.memberId = memberId;
        p.planId = planId;
        p.subscriptionId = subscriptionId;
        p.orderId = orderId;
        p.idempotencyKey = idempotencyKey;
        p.amount = amount;
        p.currency = currency;
        p.paymentStatus = PaymentStatus.READY;
        p.paymentType = paymentType;
        p.attemptSequence = attemptSequence;
        p.expiresAt = expiresAt;
        return p;
    }

    // ── 상태 전이 — constitution 4.3 상태 다이어그램 ──────────────────────
    // READY → AUTHORIZED → CONFIRMING → PAID
    // READY → CANCELED
    // AUTHORIZED / CONFIRMING / RECONCILING → FAILED
    // CONFIRMING → RECONCILING → PAID
    // PAID → REFUNDED (admin)

    public void authorize() {
        if (this.paymentStatus != PaymentStatus.READY) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        this.paymentStatus = PaymentStatus.AUTHORIZED;
    }

    public void confirmStarted() {
        if (this.paymentStatus != PaymentStatus.AUTHORIZED) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        this.paymentStatus = PaymentStatus.CONFIRMING;
    }

    public void paid(String paymentKey, ZonedDateTime approvedAt) {
        if (this.paymentStatus != PaymentStatus.CONFIRMING
                && this.paymentStatus != PaymentStatus.RECONCILING) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        if (paymentKey == null || paymentKey.isBlank()) {
            throw new IllegalArgumentException("paymentKey는 필수입니다");
        }
        if (approvedAt == null) {
            throw new IllegalArgumentException("approvedAt은 필수입니다");
        }
        this.paymentStatus = PaymentStatus.PAID;
        this.paymentKey = paymentKey;
        this.approvedAt = approvedAt;
    }

    public void fail(FailureReason reason) {
        if (this.paymentStatus != PaymentStatus.AUTHORIZED
                && this.paymentStatus != PaymentStatus.CONFIRMING
                && this.paymentStatus != PaymentStatus.RECONCILING) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        if (reason == null) {
            throw new IllegalArgumentException("failureReason은 필수입니다");
        }
        this.paymentStatus = PaymentStatus.FAILED;
        this.failureReason = reason;
    }

    public void reconciling() {
        if (this.paymentStatus != PaymentStatus.CONFIRMING) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        this.paymentStatus = PaymentStatus.RECONCILING;
    }

    public void cancel() {
        if (this.paymentStatus != PaymentStatus.READY) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        this.paymentStatus = PaymentStatus.CANCELED;
    }

    public void refund() {
        if (this.paymentStatus != PaymentStatus.PAID) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_STATUS_TRANSITION);
        }
        this.paymentStatus = PaymentStatus.REFUNDED;
    }
}
