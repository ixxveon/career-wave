package kr.co.carrer.user.billing.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public class EntitlementDTO {

    public record ResponseEntitlementList(
            Map<String, Boolean> entitlements,
            List<EntitlementItem> entitlementDetails
    ) {}

    public record EntitlementItem(
            @Schema(example = "document-coaching") String productCode,
            @Schema(allowableValues = {"FREE", "PREMIUM"}) String planType,
            int freeRemaining,
            @Schema(allowableValues = {"AVAILABLE", "RESERVED", "USED", "FORFEITED"})
            String freeUsageStatus,
            @Schema(allowableValues = {
                    "ACTIVE", "CANCEL_SCHEDULED", "PAYMENT_FAILED",
                    "EXPIRED", "REFUND_PENDING", "REFUNDED"
            }) String subscriptionStatus,
            boolean serviceAvailable,
            String unavailableReason,
            Integer monthlyLimit,
            Integer monthlyUsed,
            Integer monthlyReserved,
            Integer monthlyRemaining,
            ZonedDateTime resetAt,
            ZonedDateTime currentPeriodStart
    ) {}
}
