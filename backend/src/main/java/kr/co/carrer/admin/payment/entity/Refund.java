package kr.co.carrer.admin.payment.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.payment.type.RefundStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "refunds")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Refund {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refund_id")
    private Long refundId;

    @Column(name = "payment_id", nullable = false, columnDefinition = "UUID")
    private UUID paymentId;

    @Column(name = "admin_id")
    private Long adminId;

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

    public static Refund create(UUID paymentId, int amount, String reason, Long adminId) {
        Refund refund = new Refund();
        refund.paymentId = paymentId;
        refund.adminId = adminId;
        refund.amount = amount;
        refund.reason = reason;
        refund.refundStatus = RefundStatus.PENDING;
        refund.createdAt = ZonedDateTime.now(SERVICE_ZONE_ID);
        return refund;
    }

    public void approve(Long adminId) {
        this.refundStatus = RefundStatus.COMPLETED;
        this.adminId = adminId;
        this.refundedAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }

    public void fail(Long adminId) {
        this.refundStatus = RefundStatus.FAILED;
        this.adminId = adminId;
    }

    public void reject(Long adminId, String rejectReason) {
        this.refundStatus = RefundStatus.REJECTED;
        this.adminId = adminId;
        this.rejectReason = rejectReason;
    }
}
