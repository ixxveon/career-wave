package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.BillingPaymentClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.BillingProfileRepository;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.SubscriptionRenewalService;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.util.AesCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionRenewalServiceImpl implements SubscriptionRenewalService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final BillingProfileRepository billingProfileRepository;
    private final PlanRepository planRepository;
    private final BillingPaymentClient tossBillingPaymentClient;
    private final AesCipher aesCipher;
    private final BillingMemberPort billingMemberPort;
    private final RenewalPaymentCreateTxService renewalPaymentCreateTxService;
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

        // 2. AUTO_RENEWAL Payment 생성 또는 기존 조회 (REQUIRES_NEW 독립 TX)
        String idempotencyKey = buildIdempotencyKey(subscriptionId, attemptSequence,
                ZonedDateTime.now(KST).toLocalDate());
        UserPayment payment = renewalPaymentCreateTxService.createIfAbsent(
                subscriptionId, subscription.getMemberId(),
                plan, billingProfile.getCustomerKey(), memberInfo,
                attemptSequence, idempotencyKey);

        // 3. 이미 최종 처리된 payment면 Toss 중복 호출 방지
        if (payment.getPaymentStatus() == UserPaymentStatus.PAID
                || payment.getPaymentStatus() == UserPaymentStatus.FAILED) {
            log.info("자동결제 이미 처리됨, skip: subscriptionId={}, attemptSequence={}, status={}",
                    subscriptionId, attemptSequence, payment.getPaymentStatus());
            return;
        }

        // 4. Toss billing 호출 (트랜잭션 밖)
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

        // 5. 결산
        renewalSettleTxService.settle(payment.getPaymentId(), subscriptionId, response, plan);
        log.info("자동결제 성공: subscriptionId={}, attemptSequence={}", subscriptionId, attemptSequence);
    }

    static String buildIdempotencyKey(UUID subscriptionId, int attemptSequence, LocalDate date) {
        return "renewal:" + subscriptionId + ":" + attemptSequence + ":" + date;
    }
}
