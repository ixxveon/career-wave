package kr.co.carrer.user.billing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class BillingDTO {

    public record ProductItem(
            @Schema(example = "document-coaching") String productCode,
            @Schema(example = "서류 AI 코칭") String name,
            @Schema(example = "이력서와 자기소개서 AI 분석") String description,
            @Schema(example = "29000") int price,
            @Schema(example = "KRW") String currency,
            @Schema(example = "MONTHLY", allowableValues = {"MONTHLY"}) String billingCycle,
            List<String> features,
            boolean active,
            int monthlyUsageLimit
    ) {}

    public record ResponseSubscriptionList(
            List<SubscriptionItem> subscriptions
    ) {}

    public record SubscriptionItem(
            UUID subscriptionId,
            @Schema(example = "interview") String productCode,
            String productName,
            @Schema(allowableValues = {
                    "ACTIVE", "CANCEL_SCHEDULED", "PAYMENT_FAILED",
                    "EXPIRED", "REFUND_PENDING", "REFUNDED"
            }) String status,
            ZonedDateTime startedAt,
            ZonedDateTime currentPeriodStart,
            ZonedDateTime currentPeriodEnd,
            ZonedDateTime nextBillingAt,
            ZonedDateTime cancelScheduledAt
    ) {}

    public record ResponseUsageList(
            List<UsageItem> usages
    ) {}

    public record UsageItem(
            @Schema(example = "interview") String productCode,
            int limit,
            int used,
            int remaining,
            @Schema(example = "session") String unit,
            ZonedDateTime resetAt,
            int reserved
    ) {}

    // ── Phase 4: Checkout & Payment ────────────────────────────────────────

    public record CreateOrderRequest(
            @NotBlank @Schema(example = "document-coaching") String productCode,
            @NotBlank String successUrl,
            @NotBlank String failUrl
    ) {}

    public record CreateOrderResponse(
            String orderId,
            String idempotencyKey,
            String productCode,
            String productName,
            int amount,
            String currency,
            String billingCycle,
            String customerName,
            String customerEmail,
            String customerKey,
            ZonedDateTime expiresAt
    ) {}

    // billingKey 흐름 승인 완료 — authKey/customerKey/orderId 계약
    public record ConfirmPaymentRequest(
            @NotBlank String authKey,
            @NotBlank String customerKey,
            @NotBlank String orderId
    ) {}

    public record ConfirmPaymentResponse(
            UUID paymentId,
            String orderId,
            String productCode,
            String productName,
            int amount,
            String currency,
            @Schema(allowableValues = {"PAID"}) String paymentStatus,
            @Schema(allowableValues = {"ACTIVE"}) String subscriptionStatus,
            ZonedDateTime paidAt,
            ZonedDateTime nextBillingAt
    ) {}

    public record PaymentFailureDetail(
            String reasonCode,
            String displayMessage,
            boolean retryable
    ) {}

    public record PaymentStatusResponse(
            String orderId,
            String paymentStatus,
            String productCode,
            String productName,
            int amount,
            ZonedDateTime paidAt,
            PaymentFailureDetail failure
    ) {}

    public record RecordPaymentFailRequest(
            @NotBlank String orderId,
            @NotBlank String productCode,
            @NotNull String reasonCode,
            String message
    ) {}

    public record RecordPaymentFailResponse(
            String orderId,
            @Schema(allowableValues = {"FAILED"}) String paymentStatus,
            boolean retryable
    ) {}
}
