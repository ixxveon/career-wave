package kr.co.carrer.admin.payment.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.payment.type.FailureReason;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
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

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public void cancel() {
        this.paymentStatus = PaymentStatus.CANCELED;
    }

    public void refund() {
        this.paymentStatus = PaymentStatus.REFUNDED;
    }
}
