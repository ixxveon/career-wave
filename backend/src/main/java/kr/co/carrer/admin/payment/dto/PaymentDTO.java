package kr.co.carrer.admin.payment.dto;

import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;

import java.time.ZonedDateTime;

public class PaymentDTO {

    public record ResponseList(
        String paymentId,
        String orderId,
        String memberName,
        String planName,
        ZonedDateTime approvedAt,
        int amount,
        PaymentStatus paymentStatus,
        RefundStatus refundStatus
    ) {}

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

    public record ResponseSummary(
        long totalRevenue,
        long paidCount,
        long refundPendingCount,
        long failedCount
    ) {}
}
