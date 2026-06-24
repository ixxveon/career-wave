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
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.util.AesCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPaymentConfirmServiceImpl implements UserPaymentConfirmService {

    private final UserPaymentRepository userPaymentRepository;
    private final BillingProfileRepository billingProfileRepository;
    private final PlanRepository planRepository;
    private final TossBillingAuthorizationClient tossBillingAuthClient;
    private final TossBillingPaymentClient tossBillingPaymentClient;
    private final AesCipher aesCipher;
    private final UserPaymentFailureTxService failureTxService;
    private final UserPaymentSettleTxService settleTxService;

    @Override
    public BillingDTO.ResponseConfirmPayment confirm(UUID memberId, BillingDTO.RequestConfirmPayment request) {

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

        // 6. 원자 결산 트랜잭션 (별도 빈 — self-invocation 방지)
        return settleTxService.settle(payment, billingProfile, plan, payResponse);
    }

    @Override
    @Transactional
    public BillingDTO.ResponseRecordPaymentFail recordFail(UUID memberId,
                                                           BillingDTO.RequestRecordPaymentFail request) {
        UserPayment payment = userPaymentRepository
                .findByOrderIdAndMemberId(request.orderId(), memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        PaymentFailureReason reason = resolveReason(request.reasonCode());
        if (payment.getPaymentStatus() == UserPaymentStatus.AUTHORIZED) {
            payment.fail(reason);
        }

        return new BillingDTO.ResponseRecordPaymentFail(
                payment.getOrderId(),
                "FAILED",
                isRetryable(reason)
        );
    }

    private PaymentFailureReason resolveReason(String reasonCode) {
        if (reasonCode == null || reasonCode.isBlank()) {
            return PaymentFailureReason.UNKNOWN;
        }
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
