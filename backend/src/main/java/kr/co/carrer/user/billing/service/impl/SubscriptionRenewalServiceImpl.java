package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.TossBillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.BillingProfileRepository;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.SubscriptionRenewalService;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import kr.co.carrer.user.billing.util.AesCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionRenewalServiceImpl implements SubscriptionRenewalService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserPaymentRepository userPaymentRepository;
    private final BillingProfileRepository billingProfileRepository;
    private final PlanRepository planRepository;
    private final TossBillingPaymentClient tossBillingPaymentClient;
    private final AesCipher aesCipher;
    private final BillingMemberPort billingMemberPort;
    private final RenewalSettleTxService renewalSettleTxService;
    private final RenewalFailureTxService renewalFailureTxService;

    @Override
    public void processRenewal(Subscription subscription, int attemptSequence) {
        UUID subscriptionId = subscription.getSubscriptionId();

        // 1. 플랜 + 빌링 프로파일 조회
        Plan plan = planRepository.findById(subscription.getPlanId())
                .orElseThrow(() -> new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND));

        BillingProfile billingProfile = billingProfileRepository
                .findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
                        subscription.getMemberId(), BillingProfileStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(BillingErrorCode.PAYMENT_METHOD_REQUIRED));

        BillingMemberPort.MemberBillingInfo memberInfo =
                billingMemberPort.getMemberBillingInfo(subscription.getMemberId());

        // 2. AUTO_RENEWAL Payment 생성 (REQUIRES_NEW — 이하 Toss 호출 실패 시에도 결제 이력 보존)
        UserPayment payment = createRenewalPayment(subscription, plan, billingProfile, memberInfo, attemptSequence);

        // 3. Toss billing 호출 (트랜잭션 밖)
        TossBillingPaymentResponse response;
        try {
            response = tossBillingPaymentClient.pay(
                    aesCipher.decrypt(billingProfile.encryptedBillingKeyForService()),
                    billingProfile.getCustomerKey(),
                    memberInfo.email(),
                    memberInfo.name(),
                    payment.getOrderId(),
                    plan.getPlanName(),
                    plan.getPlanPrice()
            );
        } catch (Exception e) {
            log.warn("자동결제 Toss 호출 실패: subscriptionId={}, attemptSequence={}, error={}",
                    subscriptionId, attemptSequence, e.getClass().getSimpleName());
            renewalFailureTxService.fail(payment.getPaymentId(), subscriptionId,
                    plan.getProductCode(), attemptSequence);
            return;
        }

        // 4. 결산
        renewalSettleTxService.settle(payment.getPaymentId(), subscriptionId, response, plan);
        log.info("자동결제 성공: subscriptionId={}, attemptSequence={}", subscriptionId, attemptSequence);
    }

    // REQUIRES_NEW — idempotencyKey UNIQUE 제약으로 동일 구독·회차 중복 실행 방지
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserPayment createRenewalPayment(Subscription subscription, Plan plan,
                                             BillingProfile billingProfile,
                                             BillingMemberPort.MemberBillingInfo memberInfo,
                                             int attemptSequence) {
        String idempotencyKey = buildIdempotencyKey(subscription.getSubscriptionId(),
                attemptSequence, ZonedDateTime.now(KST).toLocalDate());

        return userPaymentRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> {
                    String orderId = "RENEWAL-" + UUID.randomUUID().toString().replace("-", "");
                    UserPayment payment = UserPayment.createAutoRenewal(
                            subscription.getMemberId(),
                            plan.getPlanId(),
                            plan.getProductCode(),
                            orderId,
                            idempotencyKey,
                            billingProfile.getCustomerKey(),
                            memberInfo.name(),
                            memberInfo.email(),
                            plan.getPlanPrice(),
                            attemptSequence
                    );
                    return userPaymentRepository.save(payment);
                });
    }

    static String buildIdempotencyKey(UUID subscriptionId, int attemptSequence, LocalDate date) {
        return "renewal:" + subscriptionId + ":" + attemptSequence + ":" + date;
    }
}
