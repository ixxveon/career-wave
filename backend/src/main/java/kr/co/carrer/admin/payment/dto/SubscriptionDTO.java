package kr.co.carrer.admin.payment.dto;

import kr.co.carrer.admin.payment.type.SubscriptionStatus;

import java.time.ZonedDateTime;

public class SubscriptionDTO {

    public record ResponseCounts(
        long active,
        long renewalScheduled,
        long cancelScheduled,
        long atRisk
    ) {}

    public record ResponseList(
        String subscriptionId,
        String memberName,
        String planName,
        ZonedDateTime startedAt,
        ZonedDateTime currentPeriodEnd,
        SubscriptionStatus subscriptionStatus,
        boolean autoRenew
    ) {}
}
