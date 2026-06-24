package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.CancelSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CancelSubscriptionServiceImpl implements CancelSubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    @Override
    @Transactional
    public BillingDTO.ResponseCancelSubscription cancel(UUID memberId, UUID subscriptionId) {
        Subscription sub = subscriptionRepository
                .findBySubscriptionIdAndMemberIdForUpdate(subscriptionId, memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND));

        // scheduleCancel()이 ACTIVE 외 상태에서 SUBSCRIPTION_NOT_CANCELABLE 예외 발생
        sub.scheduleCancel();

        return new BillingDTO.ResponseCancelSubscription(
                sub.getSubscriptionId(),
                sub.getSubscriptionStatus().name(),
                sub.getCurrentPeriodEnd(),
                sub.getCancelScheduledAt()
        );
    }
}
