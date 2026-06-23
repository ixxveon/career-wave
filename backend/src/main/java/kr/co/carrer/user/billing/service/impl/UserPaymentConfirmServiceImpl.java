package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.TossBillingAuthorizationClient;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.*;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.*;
import kr.co.carrer.user.billing.service.UserPaymentConfirmService;
import kr.co.carrer.user.billing.type.FreeUsageStatus;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.util.AesCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPaymentConfirmServiceImpl implements UserPaymentConfirmService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int BILLING_CYCLE_DAYS = 30;

    private final UserPaymentRepository userPaymentRepository;
    private final BillingProfileRepository billingProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final MemberProductEntitlementRepository entitlementRepository;
    private final SubscriptionUsagePeriodRepository subscriptionUsagePeriodRepository;
    private final PlanRepository planRepository;
    private final TossBillingAuthorizationClient tossBillingAuthClient;
    private final TossBillingPaymentClient tossBillingPaymentClient;
    private final AesCipher aesCipher;
    private final UserPaymentFailureTxService failureTxService;

    @Override
    public BillingDTO.ConfirmPaymentResponse confirm(UUID memberId, BillingDTO.ConfirmPaymentRequest request) {

        // 1. 주문 소유권·상태 검증
        UserPayment payment = userPaymentRepository.findByOrderId(request.orderId())
                .filter(p -> p.getMemberId().equals(memberId))
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        if (payment.getPaymentStatus() != UserPaymentStatus.READY) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }
        if (!payment.getCustomerKey().equals(request.customerKey())) {
            throw new CustomException(BillingErrorCode.BILLING_CUSTOMER_KEY_MISMATCH);
        }

        Plan plan = planRepository.findByProductCodeAndIsActive(payment.getProductCode(), true)
                .orElseThrow(() -> new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND));

        // 2. Toss billing auth (트랜잭션 밖)
        TossBillingAuthResponse authResponse;
        try {
            authResponse = tossBillingAuthClient.issue(request.authKey(), request.customerKey());
        } catch (Exception e) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw e;
        }

        // 3. BillingProfile 저장 (독립 저장 — billingKey 보존)
        String encryptedKey = aesCipher.encrypt(authResponse.billingKey());
        BillingProfile billingProfile = billingProfileRepository.save(
                BillingProfile.create(
                        memberId,
                        request.customerKey(),
                        encryptedKey,
                        authResponse.card() != null ? authResponse.card().company() : null,
                        authResponse.card() != null ? authResponse.card().number() : null,
                        authResponse.authenticatedAt()
                )
        );

        // 4. Toss billing payment (트랜잭션 밖)
        // 금액은 DB 기준 — 클라이언트 전달값 절대 사용 금지
        TossBillingPaymentResponse payResponse;
        try {
            payResponse = tossBillingPaymentClient.pay(
                    aesCipher.decrypt(billingProfile.encryptedBillingKeyForService()),
                    payment.getCustomerKey(),
                    payment.getCustomerEmail(),
                    payment.getCustomerName(),
                    payment.getOrderId(),
                    plan.getPlanName(),
                    plan.getPlanPrice()
            );
        } catch (Exception e) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw e;
        }

        // 5. 금액·orderId·통화 검증
        if (payResponse.totalAmount() != plan.getPlanPrice()) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }
        if (!payment.getOrderId().equals(payResponse.orderId())) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }
        if (!"KRW".equals(payResponse.currency())) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        // 6. 원자 결산 트랜잭션
        return settle(payment, billingProfile, plan, payResponse);
    }

    @Transactional
    protected BillingDTO.ConfirmPaymentResponse settle(UserPayment payment, BillingProfile billingProfile,
                                                        Plan plan, TossBillingPaymentResponse payResponse) {
        // 상태 전이: READY → AUTHORIZED → CONFIRMING → PAID
        payment.authorize();
        payment.confirmStarted();
        payment.paid(payResponse.paymentKey(), payResponse.approvedAt());

        // 구독 생성
        ZonedDateTime periodStart = payResponse.approvedAt().withZoneSameInstant(KST);
        ZonedDateTime periodEnd = periodStart.plusDays(BILLING_CYCLE_DAYS);
        Subscription subscription = Subscription.create(
                payment.getMemberId(), plan.getPlanId(),
                billingProfile.getBillingProfileId(), periodStart, periodEnd
        );
        subscriptionRepository.save(subscription);
        payment.linkSubscription(subscription.getSubscriptionId());

        // 이용권 처리
        MemberProductEntitlement entitlement = entitlementRepository
                .findByMemberIdAndProductCodeForUpdate(payment.getMemberId(), plan.getProductCode())
                .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));

        if (entitlement.getFreeUsageStatus() == FreeUsageStatus.AVAILABLE) {
            entitlement.forfeitFree();
        }
        entitlement.activatePremium(subscription.getSubscriptionId());

        // 사용 기간 생성
        subscriptionUsagePeriodRepository.save(
                SubscriptionUsagePeriod.create(
                        subscription.getSubscriptionId(),
                        plan.getProductCode(),
                        periodStart, periodEnd,
                        plan.getMonthlyUsageLimit()
                )
        );

        return new BillingDTO.ConfirmPaymentResponse(
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

    @Override
    @Transactional
    public BillingDTO.RecordPaymentFailResponse recordFail(UUID memberId,
                                                            BillingDTO.RecordPaymentFailRequest request) {
        UserPayment payment = userPaymentRepository
                .findByOrderIdAndMemberId(request.orderId(), memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        PaymentFailureReason reason = resolveReason(request.reasonCode());
        if (payment.getPaymentStatus() == UserPaymentStatus.READY
                || payment.getPaymentStatus() == UserPaymentStatus.AUTHORIZED) {
            payment.fail(reason);
        }

        return new BillingDTO.RecordPaymentFailResponse(
                payment.getOrderId(),
                "FAILED",
                isRetryable(reason)
        );
    }

    private PaymentFailureReason resolveReason(String reasonCode) {
        try {
            return PaymentFailureReason.valueOf(reasonCode);
        } catch (IllegalArgumentException e) {
            return PaymentFailureReason.UNKNOWN;
        }
    }

    private boolean isRetryable(PaymentFailureReason reason) {
        return switch (reason) {
            case USER_CANCELED, CARD_DECLINED, TIMEOUT -> true;
            default -> false;
        };
    }
}
