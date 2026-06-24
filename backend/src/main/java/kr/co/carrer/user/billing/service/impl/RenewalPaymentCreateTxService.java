package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// AUTO_RENEWAL Payment 생성 독립 트랜잭션 — Toss 호출 실패 시에도 결제 이력 DB에 보존
// self-call 프록시 우회 문제를 피하기 위해 SubscriptionRenewalServiceImpl에서 분리
@Service
@RequiredArgsConstructor
public class RenewalPaymentCreateTxService {

    private final UserPaymentRepository userPaymentRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserPayment createIfAbsent(UUID subscriptionId, UUID memberId,
                                      Plan plan, String customerKey,
                                      BillingMemberPort.MemberBillingInfo memberInfo,
                                      int attemptSequence, String idempotencyKey) {
        return userPaymentRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> {
                    String orderId = "RENEWAL-" + UUID.randomUUID().toString().replace("-", "");
                    UserPayment payment = UserPayment.createAutoRenewal(
                            memberId,
                            plan.getPlanId(),
                            plan.getProductCode(),
                            orderId,
                            idempotencyKey,
                            customerKey,
                            memberInfo.name(),
                            memberInfo.email(),
                            plan.getPlanPrice(),
                            attemptSequence
                    );
                    payment.linkSubscription(subscriptionId); // subscription_id null 방지
                    return userPaymentRepository.save(payment);
                });
    }
}
