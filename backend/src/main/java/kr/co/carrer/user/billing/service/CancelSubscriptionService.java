package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;

import java.util.UUID;

public interface CancelSubscriptionService {
    BillingDTO.ResponseCancelSubscription cancel(UUID memberId, UUID subscriptionId);
}
