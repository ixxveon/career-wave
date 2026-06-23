package kr.co.carrer.user.billing.dto;

import java.util.List;

public class EntitlementDTO {

    public record ResponseEntitlementList(
            List<EntitlementItem> entitlements
    ) {}

    public record EntitlementItem(
            String productCode,
            String planType,
            int freeRemaining,
            String freeUsageStatus,
            boolean serviceAvailable,
            String unavailableReason
    ) {}
}
