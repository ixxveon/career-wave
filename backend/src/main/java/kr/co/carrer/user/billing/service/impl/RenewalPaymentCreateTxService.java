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
                .orElseGet(() -> insertNew(subscriptionId, memberId, plan, customerKey,
                        memberInfo, attemptSequence, idempotencyKey));
    }

    // 배치 선로딩 경로 전용 — idempotencyKey 조회를 미리 일괄 수행했으므로 여기선 재조회하지 않는다.
    // preloaded가 있으면 재사용, 없으면 신규 생성(uq_payments_idempotency_key 유니크 제약이 중복 삽입을 최종 방어).
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserPayment createWithPreloaded(UUID subscriptionId, UUID memberId,
                                           Plan plan, String customerKey,
                                           BillingMemberPort.MemberBillingInfo memberInfo,
                                           int attemptSequence, String idempotencyKey,
                                           UserPayment preloaded) {
        if (preloaded != null) {
            return preloaded;
        }
        return insertNew(subscriptionId, memberId, plan, customerKey,
                memberInfo, attemptSequence, idempotencyKey);
    }

    private UserPayment insertNew(UUID subscriptionId, UUID memberId,
                                  Plan plan, String customerKey,
                                  BillingMemberPort.MemberBillingInfo memberInfo,
                                  int attemptSequence, String idempotencyKey) {
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
    }
}
