package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.UserCheckoutOrderService;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserCheckoutOrderServiceImpl implements UserCheckoutOrderService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int ORDER_EXPIRY_MINUTES = 30;

    private static final Set<SubscriptionStatus> BLOCKING_STATUSES = Set.of(
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCEL_SCHEDULED,
            SubscriptionStatus.PAYMENT_FAILED
    );

    private final BillingMemberPort billingMemberPort;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserPaymentRepository userPaymentRepository;
    private final UserPaymentCreateTxService createTxService;

    @Override
    @Transactional
    public BillingDTO.ResponseCreateOrder createOrder(UUID memberId, BillingDTO.RequestCreateOrder request) {

        if (!billingMemberPort.isEligibleForBilling(memberId)) {
            throw new CustomException(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE);
        }

        Plan plan = planRepository.findByProductCodeAndIsActive(request.productCode(), true)
                .orElseThrow(() -> new CustomException(BillingErrorCode.PRODUCT_NOT_FOUND));

        boolean hasBlockingSubscription = subscriptionRepository
                .findActiveLikeByMemberIdAndPlanId(memberId, plan.getPlanId(), BLOCKING_STATUSES)
                .stream().anyMatch(s -> BLOCKING_STATUSES.contains(s.getSubscriptionStatus()));
        if (hasBlockingSubscription) {
            throw new CustomException(BillingErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
        }

        // 재사용 주문은 행 잠금으로 조회한다 — 동시 재결제 요청이 orderId 재발급을 서로 덮어쓰지 않도록 직렬화.
        Optional<UserPayment> existing =
                userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, plan.getPlanId());
        if (existing.isPresent()) {
            // 재결제 진입마다 새 orderId·만료시각을 부여한다. (이전 시도에서 Toss 가 소비한 orderId 를 재사용하면
            // 단건결제가 DUPLICATED_ORDER_ID 로 막히므로, 재사용 주문에 항상 새 orderId 를 발급한다)
            UserPayment order = existing.get();
            order.renewOrderForRetry(newOrderId(), ZonedDateTime.now(KST).plusMinutes(ORDER_EXPIRY_MINUTES));
            return toCreateOrderResponse(order, plan);
        }

        BillingMemberPort.MemberBillingInfo memberInfo = billingMemberPort.getMemberBillingInfo(memberId);
        try {
            UserPayment payment = createTxService.createAndFlush(memberId, plan, memberInfo);
            return toCreateOrderResponse(payment, plan);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 uq_payments_member_plan_ready 위반 — 경쟁 스레드가 삽입한 READY 주문을
            // 행 잠금으로 다시 읽고 새 orderId 를 재발급해 반환한다. (경쟁한 두 클라이언트가 같은 orderId 로
            // Toss 결제에 진입해 한쪽이 DUPLICATED_ORDER_ID 에 걸리지 않도록, 응답마다 서로 다른 orderId 를 보장)
            UserPayment rival = userPaymentRepository
                    .findReadyByMemberIdAndPlanIdForUpdate(memberId, plan.getPlanId())
                    .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
            rival.renewOrderForRetry(newOrderId(), ZonedDateTime.now(KST).plusMinutes(ORDER_EXPIRY_MINUTES));
            return toCreateOrderResponse(rival, plan);
        }
    }

    private static String newOrderId() {
        return "ORDER-" + UUID.randomUUID().toString().replace("-", "");
    }

    private BillingDTO.ResponseCreateOrder toCreateOrderResponse(UserPayment payment, Plan plan) {
        return new BillingDTO.ResponseCreateOrder(
                payment.getOrderId(),
                payment.getIdempotencyKey(),
                plan.getProductCode(),
                plan.getPlanName(),
                plan.getPlanPrice(),
                plan.getCurrency(),
                plan.getBillingCycle(),
                payment.getCustomerName(),
                payment.getCustomerEmail(),
                payment.getCustomerKey(),
                payment.getExpiresAt()
        );
    }
}
