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

    // 배치 선로딩 경로 전용 — 멱등 선로딩에서 미존재로 확인된 건만 신규 생성한다.
    // (선로딩 결과가 있으면 호출측에서 재사용하므로 이 메서드는 실제 삽입이 필요할 때만 호출된다 →
    //  멱등 히트 시 불필요한 REQUIRES_NEW 트랜잭션을 열지 않는다.)
    // uq_payments_idempotency_key 유니크 제약이 중복 삽입을 최종 방어한다.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserPayment createNew(UUID subscriptionId, UUID memberId,
                                 Plan plan, String customerKey,
                                 BillingMemberPort.MemberBillingInfo memberInfo,
                                 int attemptSequence, String idempotencyKey) {
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
