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

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserCheckoutOrderServiceImpl implements UserCheckoutOrderService {

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

        // 재결제 진입 시 기존 READY 주문을 취소하고, 항상 새 주문(고정 orderId)을 만든다.
        // orderId 를 사후에 바꾸지 않으므로 createOrder→requestPayment→confirm 사이에 orderId 가 어긋나
        // BILLING_ORDER_NOT_FOUND(404) 가 나던 문제를 없애고, 매번 새 orderId 라 Toss 가 이미 소비한
        // orderId 를 재사용하지 않아 DUPLICATED_ORDER_ID 도 발생하지 않는다.
        // (취소는 REQUIRES_NEW 로 먼저 커밋되어야 새 READY INSERT 가 부분 유니크 인덱스와 충돌하지 않는다)
        createTxService.cancelReadyIfPresent(memberId, plan.getPlanId());

        BillingMemberPort.MemberBillingInfo memberInfo = billingMemberPort.getMemberBillingInfo(memberId);
        try {
            UserPayment payment = createTxService.createAndFlush(memberId, plan, memberInfo);
            return toCreateOrderResponse(payment, plan);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 uq_payments_member_plan_ready 위반 — 경쟁 스레드가 방금 삽입한 READY 주문을
            // 그대로 반환한다. (이 주문은 아직 Toss 에 제출되지 않은 신규 orderId 이므로 재사용해도 안전)
            return userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, plan.getPlanId())
                    .map(p -> toCreateOrderResponse(p, plan))
                    .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));
        }
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
