package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.*;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

// RECONCILING → PAID 원자 복구 트랜잭션 — self-invocation 우회
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReconciliationTxService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int BILLING_CYCLE_DAYS = 30;

    private final UserPaymentRepository userPaymentRepository;
    private final BillingProfileRepository billingProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final MemberProductEntitlementRepository entitlementRepository;
    private final SubscriptionUsagePeriodRepository subscriptionUsagePeriodRepository;
    private final PlanRepository planRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markForReconciliation(UUID paymentId) {
        // 비관적 락으로 만료/실패 경로와의 동시 갱신 충돌 방지
        userPaymentRepository.findByIdForUpdate(paymentId).ifPresent(payment -> {
            if (payment.getPaymentStatus().name().equals("READY")) {
                payment.markForReconciliation();
            }
        });
    }

    // RECONCILING → PAID 멱등 복구
    // paymentId만 받아 REQUIRES_NEW TX 내에서 재조회/비관적 락 후 상태 확정
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reconcileAsPaid(UUID paymentId, TossBillingPaymentResponse tossResponse) {
        UserPayment payment = userPaymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        if (payment.getSubscriptionId() != null) {
            // 이미 구독이 연결됨 — 멱등: PAID만 확정
            payment.paid(tossResponse.paymentKey(), tossResponse.method(), tossResponse.approvedAt());
            log.info("RECONCILING 복구(멱등): paymentId={}, 구독 기존 존재", paymentId);
            return;
        }

        Plan plan = planRepository.findByProductCodeAndIsActive(payment.getProductCode(), true)
                .orElseThrow(() -> new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND));

        payment.paid(tossResponse.paymentKey(), tossResponse.method(), tossResponse.approvedAt());

        ZonedDateTime periodStart = tossResponse.approvedAt().withZoneSameInstant(KST);
        ZonedDateTime periodEnd = periodStart.plusDays(BILLING_CYCLE_DAYS);

        // BillingProfile이 없으면 구독 연결 불가 — billingProfileId nullable
        UUID billingProfileId = billingProfileRepository
                .findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                        payment.getMemberId(), kr.co.carrer.user.billing.type.BillingProfileStatus.ACTIVE)
                .map(BillingProfile::getBillingProfileId)
                .orElse(null);

        Subscription subscription = Subscription.create(
                payment.getMemberId(), plan.getPlanId(), billingProfileId, periodStart, periodEnd);
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

        log.info("RECONCILING 복구 완료: paymentId={}, subscriptionId={}", paymentId, subscription.getSubscriptionId());
    }
}
