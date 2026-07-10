package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

// 자동결제 성공 원자 트랜잭션 — self-invocation 우회를 위해 분리
@Service
@RequiredArgsConstructor
public class RenewalSettleTxService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int BILLING_CYCLE_DAYS = 30;

    private final UserPaymentRepository userPaymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionUsagePeriodRepository subscriptionUsagePeriodRepository;

    @Transactional
    public void settle(UUID paymentId, UUID subscriptionId,
                       TossBillingPaymentResponse response, Plan plan) {
        UserPayment payment = userPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
        payment.paid(response.paymentKey(), response.method(), response.approvedAt());

        Subscription sub = subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND));

        ZonedDateTime periodStart = response.approvedAt().withZoneSameInstant(KST);
        ZonedDateTime periodEnd = periodStart.plusDays(BILLING_CYCLE_DAYS);
        sub.renewPeriod(periodStart, periodEnd);

        subscriptionUsagePeriodRepository.save(
                SubscriptionUsagePeriod.create(
                        sub.getSubscriptionId(),
                        plan.getProductCode(),
                        periodStart, periodEnd,
                        plan.getMonthlyUsageLimit()
                )
        );
    }
}
