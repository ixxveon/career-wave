package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.BillingConsent;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.BillingConsentRepository;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.service.UserCheckoutOrderService;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserCheckoutOrderServiceImpl implements UserCheckoutOrderService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final String TERMS_VERSION = "v1.0";
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
    private final BillingConsentRepository billingConsentRepository;

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

        // 같은 상품의 READY 주문이 이미 있으면 반환 (멱등)
        return userPaymentRepository.findReadyByMemberIdAndPlanId(memberId, plan.getPlanId())
                .map(existing -> toCreateOrderResponse(existing, plan))
                .orElseGet(() -> createNewOrder(memberId, plan, request));
    }

    private BillingDTO.ResponseCreateOrder createNewOrder(UUID memberId, Plan plan,
                                                           BillingDTO.RequestCreateOrder request) {
        BillingMemberPort.MemberBillingInfo memberInfo = billingMemberPort.getMemberBillingInfo(memberId);
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
        userPaymentRepository.save(payment);

        billingConsentRepository.save(BillingConsent.agree(memberId, plan.getPlanId(), TERMS_VERSION));

        return toCreateOrderResponse(payment, plan);
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
