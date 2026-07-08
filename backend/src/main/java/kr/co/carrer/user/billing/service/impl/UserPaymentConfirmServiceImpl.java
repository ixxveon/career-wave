package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.BillingAuthorizationClient;
import kr.co.carrer.user.billing.client.BillingPaymentClient;
import kr.co.carrer.user.billing.client.OneTimePaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingAuthResponse;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.client.dto.TossOneTimeConfirmResult;
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

// Toss billing payment 호출 결과에 따른 분기:
// 4xx → PAYMENT_CONFIRM_FAILED → 즉시 FAILED 확정
// 5xx / timeout → PAYMENT_RECONCILIATION_REQUIRED → RECONCILING 전이 (대사 스케줄러가 처리)

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPaymentConfirmServiceImpl implements UserPaymentConfirmService {

    private final UserPaymentRepository userPaymentRepository;
    private final BillingProfileRepository billingProfileRepository;
    private final PlanRepository planRepository;
    private final BillingAuthorizationClient tossBillingAuthClient;
    private final BillingPaymentClient tossBillingPaymentClient;
    private final OneTimePaymentClient oneTimePaymentClient;
    private final AesCipher aesCipher;
    private final UserPaymentFailureTxService failureTxService;
    private final UserPaymentSettleTxService settleTxService;
    private final PaymentReconciliationTxService reconciliationTxService;

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
        } catch (CustomException e) {
            if (e.getErrorCode() == BillingErrorCode.PAYMENT_RECONCILIATION_REQUIRED) {
                // 5xx / timeout: 결제가 Toss에 도달했을 수 있음 → RECONCILING 전이
                reconciliationTxService.markForReconciliation(payment.getPaymentId());
                throw e; // 202 ACCEPTED 반환
            }
            // 4xx 등 즉시 실패
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw e;
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

    // 일반결제(단건) 승인 — 자동결제 계약 없이 토스페이 QR 단건결제로 구독을 개통한다.
    // billingAuth(카드등록) 대신 Toss가 이미 승인한 paymentKey 를 서버에서 최종 confirm 한 뒤 결산한다.
    @Override
    public BillingDTO.ResponseConfirmPayment confirmOneTime(UUID memberId,
                                                            BillingDTO.RequestConfirmOneTimePayment request) {

        // 1. 주문 소유권·상태 검증
        UserPayment payment = userPaymentRepository.findByOrderId(request.orderId())
                .filter(p -> p.getMemberId().equals(memberId))
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        if (payment.getPaymentStatus() != UserPaymentStatus.READY) {
            throw new CustomException(BillingErrorCode.BILLING_ORDER_NOT_READY);
        }

        Plan plan = planRepository.findByProductCodeAndIsActive(payment.getProductCode(), true)
                .orElseThrow(() -> new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND));

        // 2. 금액 위·변조 방어: 클라이언트가 보낸 금액이 서버 상품 금액과 일치해야 한다.
        if (request.amount() != plan.getPlanPrice()) {
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        // 3. Toss 단건결제 승인 (트랜잭션 밖)
        TossOneTimeConfirmResult result;
        try {
            result = oneTimePaymentClient.confirm(request.paymentKey(), request.orderId(), request.amount());
        } catch (Exception e) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw e;
        }

        // 4. 금액·orderId·통화 검증 (Toss 승인 결과 재검증)
        if (result.totalAmount() != plan.getPlanPrice()) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }
        if (!payment.getOrderId().equals(result.orderId())) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }
        if (!"KRW".equals(result.currency())) {
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            throw new CustomException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        // 5. 원자 결산 트랜잭션 (billingProfile 없이 구독/이용권 발급)
        return settleTxService.settleOneTime(payment, plan, result);
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
