package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.BillingConsent;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.BillingConsentRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserPaymentCreateTxService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final String TERMS_VERSION = "v1.0";
    private static final int ORDER_EXPIRY_MINUTES = 30;

    private final UserPaymentRepository userPaymentRepository;
    private final BillingConsentRepository billingConsentRepository;

    /**
     * REQUIRES_NEW: 상위 트랜잭션과 분리된 독립 트랜잭션에서 INSERT.
     * saveAndFlush()로 즉시 uq_payments_member_plan_ready 제약을 검사하므로,
     * 호출 측에서 DataIntegrityViolationException을 잡아 readback할 수 있다.
     */
    /**
     * REQUIRES_NEW: 기존 READY 주문을 행 잠금으로 조회해 CANCELED 로 확정한다.
     * 새 주문 INSERT 전에 이 취소가 커밋되어야 부분 유니크 인덱스(uq_payments_member_plan_ready) 와
     * 충돌하지 않으므로, 상위 트랜잭션과 분리된 독립 트랜잭션에서 처리한다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancelReadyIfPresent(UUID memberId, Long planId) {
        userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, planId)
                .ifPresent(UserPayment::cancel);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserPayment createAndFlush(UUID memberId, Plan plan,
                                      BillingMemberPort.MemberBillingInfo memberInfo) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        ZonedDateTime expiresAt = now.plusMinutes(ORDER_EXPIRY_MINUTES);
        String orderId = "ORDER-" + UUID.randomUUID().toString().replace("-", "");
        String idempotencyKey = UUID.randomUUID().toString();
        String customerKey = UUID.randomUUID().toString();

        UserPayment payment = UserPayment.createReady(
                memberId, plan.getPlanId(), plan.getProductCode(),
                orderId, idempotencyKey, customerKey,
                memberInfo.name(), memberInfo.email(),
                plan.getPlanPrice(), expiresAt
        );
        userPaymentRepository.saveAndFlush(payment);
        billingConsentRepository.save(BillingConsent.agree(memberId, plan.getPlanId(), TERMS_VERSION));
        return payment;
    }
}
