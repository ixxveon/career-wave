package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.client.dto.TossOneTimeConfirmResult;
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
        payment.paid(payResponse.paymentKey(), payResponse.method(), payResponse.approvedAt());

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

    /**
     * 일반결제(단건) 결산. billingProfile(billingKey) 없이 구독/이용권을 발급한다.
     *
     * <p>자동결제 계약이 없는 환경에서 토스페이 QR 단건결제로 구독을 개통하기 위한 경로다.
     * 화면상으로는 월 자동결제 구독과 동일하게 보이도록 {@link Subscription#create}(billingProfileId=null,
     * autoRenew=true, nextBillingAt=periodEnd)를 그대로 사용한다. 실제 billingKey가 없으므로
     * 다음 결제일에 자동 갱신은 되지 않는다 — 갱신 스케줄러가 nextBillingAt 도달 시 ACTIVE billingProfile을
     * 찾지 못해 PAYMENT_METHOD_REQUIRED로 해당 구독만 실패 처리하며(스케줄러 루프는 구독별 try/catch로 격리),
     * 다른 구독에는 영향을 주지 않는다.
     */
    @Transactional
    public BillingDTO.ResponseConfirmPayment settleOneTime(UserPayment payment, Plan plan,
                                                           TossOneTimeConfirmResult result) {
        payment.authorize();
        payment.confirmStarted();
        payment.paid(result.paymentKey(), result.method(), result.approvedAt());

        ZonedDateTime periodStart = result.approvedAt().withZoneSameInstant(KST);
        ZonedDateTime periodEnd = periodStart.plusDays(BILLING_CYCLE_DAYS);
        Subscription subscription = Subscription.create(
                payment.getMemberId(), plan.getPlanId(), periodStart, periodEnd
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
