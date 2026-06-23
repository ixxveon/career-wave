package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.MemberProductEntitlementRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// 자동결제 실패 원자 트랜잭션 — 주 트랜잭션이 롤백되어도 실패 이력은 DB에 영구 저장
@Slf4j
@Service
@RequiredArgsConstructor
public class RenewalFailureTxService {

    private final UserPaymentRepository userPaymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final MemberProductEntitlementRepository entitlementRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(UUID paymentId, UUID subscriptionId, String productCode, int attemptSequence) {
        UserPayment payment = userPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
        payment.fail(PaymentFailureReason.CONFIRM_FAILED);

        Subscription sub = subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND));

        if (attemptSequence < 2) {
            // 최초 실패(0): ACTIVE→PAYMENT_FAILED, paymentFailedAt 기록
            // 1차 재시도 실패(1): PAYMENT_FAILED 유지, paymentFailedAt 보존
            sub.markPaymentFailed();
            if (attemptSequence == 1) {
                sub.incrementRetryCount();
            }
        } else {
            // 2차 재시도 최종 실패: PAYMENT_FAILED→EXPIRED, 권한 FREE로 강등
            sub.expire();
            MemberProductEntitlement entitlement = entitlementRepository
                    .findByMemberIdAndProductCodeForUpdate(sub.getMemberId(), productCode)
                    .orElseThrow(() -> new CustomException(BillingErrorCode.ENTITLEMENT_NOT_FOUND));
            entitlement.deactivatePremium();
        }
    }
}
