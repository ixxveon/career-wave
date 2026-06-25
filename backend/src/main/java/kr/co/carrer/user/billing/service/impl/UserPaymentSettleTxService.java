package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.SubscriptionUsagePeriodRepository;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;

// 결산 원자 트랜잭션 — self-invocation 우회를 위해 분리
@Service
@RequiredArgsConstructor
public class UserPaymentSettleTxService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int BILLING_CYCLE_DAYS = 30;

    private final SubscriptionRepository subscriptionRepository;
    private final MemberProductEntitlementRepository entitlementRepository;
    private final SubscriptionUsagePeriodRepository subscriptionUsagePeriodRepository;

    @Transactional
    public BillingDTO.ResponseConfirmPayment settle(UserPayment payment, BillingProfile billingProfile,
                                                    Plan plan, TossBillingPaymentResponse payResponse) {
        payment.authorize();
        payment.confirmStarted();
        payment.paid(payResponse.paymentKey(), payResponse.approvedAt());

        ZonedDateTime periodStart = payResponse.approvedAt().withZoneSameInstant(KST);
        ZonedDateTime periodEnd = periodStart.plusDays(BILLING_CYCLE_DAYS);
        Subscription subscription = Subscription.create(
                payment.getMemberId(), plan.getPlanId(),
                billingProfile.getBillingProfileId(), periodStart, periodEnd
        );
        subscriptionRepository.save(subscription);
        payment.linkSubscription(subscription.getSubscriptionId());

        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(payment.getMemberId(), plan.getProductCode())
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        if (entitlement.getFreeUsageStatus() == FreeUsageStatus.AVAILABLE) {
            entitlement.forfeitFree();
        }
        entitlement.activatePremium(subscription.getSubscriptionId());

        subscriptionUsagePeriodRepository.save(
                SubscriptionUsagePeriod.create(
                        subscription.getSubscriptionId(),
                        plan.getProductCode(),
                        periodStart, periodEnd,
                        plan.getMonthlyUsageLimit()
                )
        );

        return new BillingDTO.ResponseConfirmPayment(
                payment.getPaymentId(),
                payment.getOrderId(),
                plan.getProductCode(),
                plan.getPlanName(),
                plan.getPlanPrice(),
                plan.getCurrency(),
                "PAID",
                "ACTIVE",
                payment.getApprovedAt(),
                subscription.getNextBillingAt()
        );
    }
}
