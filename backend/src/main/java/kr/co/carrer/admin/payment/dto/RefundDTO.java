package kr.co.carrer.admin.payment.dto;

import jakarta.validation.constraints.NotBlank;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;

public class RefundDTO {

    public record RequestReject(
        @NotBlank String rejectReason
    ) {}

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
