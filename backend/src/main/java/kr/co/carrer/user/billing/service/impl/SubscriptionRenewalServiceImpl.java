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
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.RenewalContext;
import kr.co.carrer.user.billing.service.SubscriptionRenewalService;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.util.AesCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionRenewalServiceImpl implements SubscriptionRenewalService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final BillingProfileRepository billingProfileRepository;
    private final PlanRepository planRepository;
    private final UserPaymentRepository userPaymentRepository;
    private final BillingPaymentClient tossBillingPaymentClient;
    private final AesCipher aesCipher;
    private final BillingMemberPort billingMemberPort;
    private final RenewalPaymentCreateTxService renewalPaymentCreateTxService;
    private final RenewalSettleTxService renewalSettleTxService;
    private final RenewalFailureTxService renewalFailureTxService;

    // 배치 병렬 처리 스레드 수 — HikariCP 커넥션 풀 크기에 맞춰 조정. 기본 20.
    @Value("${billing.renewal.concurrency:20}")
    private int renewalConcurrency = 20;

    // 건당 처리 타임아웃(초) — 지연 태스크가 스케줄러 스레드를 무한 블록하지 않도록.
    // 실 Toss 클라이언트 responseTimeout(10s)보다 크게 두어 결산 DB 처리 여유 확보. 기본 30s.
    @Value("${billing.renewal.task-timeout-seconds:30}")
    private long renewalTaskTimeoutSeconds = 30;

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

        // 3. Toss 호출 → 결산/실패 (배치 경로와 공통)
        settleOrFail(subscriptionId, attemptSequence, plan, billingProfile, memberInfo, payment);
    }

    // 결제 최종 상태 확인 → Toss 호출 → 결산 또는 실패 처리. processRenewal·renewWithContext 공통.
    private void settleOrFail(UUID subscriptionId, int attemptSequence, Plan plan,
                             BillingProfile billingProfile, BillingMemberPort.MemberBillingInfo memberInfo,
                             UserPayment payment) {
        // 이미 최종 처리된 payment면 Toss 중복 호출 방지
        if (payment.getPaymentStatus() == UserPaymentStatus.PAID
                || payment.getPaymentStatus() == UserPaymentStatus.FAILED) {
            log.info("자동결제 이미 처리됨, skip: subscriptionId={}, attemptSequence={}, status={}",
                    subscriptionId, attemptSequence, payment.getPaymentStatus());
            return;
        }

        // Toss billing 호출 (트랜잭션 밖)
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

        // 결산
        renewalSettleTxService.settle(payment.getPaymentId(), subscriptionId, response, plan);
        log.info("자동결제 성공: subscriptionId={}, attemptSequence={}", subscriptionId, attemptSequence);
    }

    @Override
    public int processDueBatch(List<Subscription> subscriptions, ToIntFunction<Subscription> attemptSequenceResolver) {
        if (subscriptions == null || subscriptions.isEmpty()) {
            return 0;
        }

        // 1. attemptSequence 해석 + 대상 필터 (음수는 스킵)
        Map<UUID, Integer> attemptBySub = new HashMap<>();
        List<Subscription> eligible = new ArrayList<>();
        for (Subscription sub : subscriptions) {
            int seq = attemptSequenceResolver.applyAsInt(sub);
            if (seq < 0) {
                continue;
            }
            attemptBySub.put(sub.getSubscriptionId(), seq);
            eligible.add(sub);
        }
        if (eligible.isEmpty()) {
            return 0;
        }

        // 2. 루프 밖 일괄 선로딩 (N+1 제거)
        LocalDate today = ZonedDateTime.now(KST).toLocalDate();
        RenewalContext context = buildContext(eligible, attemptBySub, today);

        // 3. bounded 병렬 처리 — 건별 독립(멱등키 상이) 이라 데이터 경합 없음
        int poolSize = Math.max(1, Math.min(renewalConcurrency, eligible.size()));
        ExecutorService pool = Executors.newFixedThreadPool(poolSize);
        try {
            List<Future<Boolean>> futures = new ArrayList<>(eligible.size());
            for (Subscription sub : eligible) {
                int seq = attemptBySub.get(sub.getSubscriptionId());
                futures.add(pool.submit(() -> {
                    try {
                        renewWithContext(sub, seq, context, today);
                        return true;
                    } catch (Exception e) {
                        log.warn("자동결제 처리 실패: subscriptionId={}, error={}",
                                sub.getSubscriptionId(), e.getClass().getSimpleName());
                        return false;
                    }
                }));
            }
            int success = 0;
            for (Future<Boolean> future : futures) {
                try {
                    // 건당 타임아웃 — 지연 태스크가 스케줄러 스레드(@Scheduled 단일 스레드)를 무한 블록하는 것 방지
                    if (Boolean.TRUE.equals(future.get(renewalTaskTimeoutSeconds, TimeUnit.SECONDS))) {
                        success++;
                    }
                } catch (TimeoutException e) {
                    future.cancel(true); // 지연 태스크 인터럽트
                    log.warn("자동결제 태스크 타임아웃({}s) — 취소", renewalTaskTimeoutSeconds);
                } catch (Exception e) {
                    log.warn("자동결제 태스크 취합 실패: error={}", e.getClass().getSimpleName());
                }
            }
            return success;
        } finally {
            pool.shutdownNow(); // 남은 지연 태스크 인터럽트 후 종료
        }
    }

    // 대상 구독들의 plan/profile/회원정보/멱등결제를 IN 절 배치 쿼리로 한 번에 로딩
    private RenewalContext buildContext(List<Subscription> subs, Map<UUID, Integer> attemptBySub, LocalDate today) {
        Set<Long> planIds = subs.stream().map(Subscription::getPlanId).collect(Collectors.toSet());
        Map<Long, Plan> plans = planRepository.findAllById(planIds).stream()
                .collect(Collectors.toMap(Plan::getPlanId, Function.identity()));

        Set<UUID> memberIds = subs.stream().map(Subscription::getMemberId).collect(Collectors.toSet());
        // 회원별 최신 ACTIVE 프로파일 (findFirst...OrderByCreatedAtDesc 와 동일 의미)
        Map<UUID, BillingProfile> profiles = billingProfileRepository
                .findByMemberIdInAndBillingProfileStatus(memberIds, BillingProfileStatus.ACTIVE).stream()
                .collect(Collectors.toMap(
                        BillingProfile::getMemberId,
                        Function.identity(),
                        (a, b) -> a.getCreatedAt().isAfter(b.getCreatedAt()) ? a : b));

        Map<UUID, BillingMemberPort.MemberBillingInfo> memberInfos =
                billingMemberPort.getMemberBillingInfoBatch(memberIds);

        List<String> idempotencyKeys = subs.stream()
                .map(s -> buildIdempotencyKey(s.getSubscriptionId(), attemptBySub.get(s.getSubscriptionId()), today))
                .toList();
        Map<String, UserPayment> existingPayments = userPaymentRepository.findByIdempotencyKeyIn(idempotencyKeys).stream()
                .collect(Collectors.toMap(UserPayment::getIdempotencyKey, Function.identity(), (a, b) -> a));

        return new RenewalContext(plans, profiles, memberInfos, existingPayments);
    }

    // processRenewal 과 동일 흐름이나 조회를 context Map lookup 으로 대체 (건별 read 제거)
    private void renewWithContext(Subscription subscription, int attemptSequence,
                                  RenewalContext context, LocalDate today) {
        UUID subscriptionId = subscription.getSubscriptionId();

        Plan plan = context.plan(subscription.getPlanId());
        if (plan == null) {
            throw new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND);
        }
        BillingProfile billingProfile = context.activeProfile(subscription.getMemberId());
        if (billingProfile == null) {
            throw new CustomException(BillingErrorCode.PAYMENT_METHOD_REQUIRED);
        }
        BillingMemberPort.MemberBillingInfo memberInfo = context.memberInfo(subscription.getMemberId());
        if (memberInfo == null) {
            throw new CustomException(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE);
        }

        String idempotencyKey = buildIdempotencyKey(subscriptionId, attemptSequence, today);
        // 멱등 선로딩된 결제가 있으면 재사용(REQUIRES_NEW TX 미개시), 없으면 신규 생성
        UserPayment preloaded = context.existingPayment(idempotencyKey);
        UserPayment payment = (preloaded != null)
                ? preloaded
                : renewalPaymentCreateTxService.createNew(
                        subscriptionId, subscription.getMemberId(),
                        plan, billingProfile.getCustomerKey(), memberInfo,
                        attemptSequence, idempotencyKey);

        settleOrFail(subscriptionId, attemptSequence, plan, billingProfile, memberInfo, payment);
    }

    static String buildIdempotencyKey(UUID subscriptionId, int attemptSequence, LocalDate date) {
        return "renewal:" + subscriptionId + ":" + attemptSequence + ":" + date;
    }
}
