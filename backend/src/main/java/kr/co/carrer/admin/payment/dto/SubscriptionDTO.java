package kr.co.carrer.admin.payment.dto;

import kr.co.carrer.admin.payment.type.SubscriptionStatus;

import java.time.ZonedDateTime;

public class SubscriptionDTO {

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
