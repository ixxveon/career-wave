package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.impl.UserCheckoutOrderServiceImpl;
import kr.co.carrer.user.billing.service.impl.UserPaymentCreateTxService;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckoutOrderServiceTest {

    @Mock BillingMemberPort billingMemberPort;
    @Mock PlanRepository planRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock UserPaymentRepository userPaymentRepository;
    @Mock UserPaymentCreateTxService createTxService;

    private UserCheckoutOrderServiceImpl service;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new UserCheckoutOrderServiceImpl(
                billingMemberPort, planRepository, subscriptionRepository,
                userPaymentRepository, createTxService);
    }

    @Test
    @DisplayName("document-coaching 상품 READY 주문 생성 성공")
    void createOrder_document_success() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", "ORDER-NEW");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 1L))
                .willReturn(Optional.empty());
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(createTxService.createAndFlush(eq(memberId), eq(plan), any())).willReturn(payment);

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.productCode()).isEqualTo("document-coaching");
        assertThat(response.amount()).isEqualTo(29000);
        assertThat(response.currency()).isEqualTo("KRW");
        assertThat(response.orderId()).isEqualTo("ORDER-NEW");
        assertThat(response.customerKey()).isNotNull();
        assertThat(response.expiresAt()).isAfter(ZonedDateTime.now(KST));
        verify(createTxService).createAndFlush(eq(memberId), eq(plan), any());
    }

    @Test
    @DisplayName("interview 상품 READY 주문 생성 성공")
    void createOrder_interview_success() {
        Plan plan = plan(2L, "interview", "AI 모의면접", 29000);
        UserPayment payment = readyPayment(memberId, 2L, "interview", "ORDER-INT");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("interview", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 2L))
                .willReturn(Optional.empty());
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(createTxService.createAndFlush(eq(memberId), eq(plan), any())).willReturn(payment);

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("interview", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.productCode()).isEqualTo("interview");
        assertThat(response.amount()).isEqualTo(29000);
    }

    @Test
    @DisplayName("가격은 DB에서 가져오며 FE 전달값을 사용하지 않음")
    void createOrder_priceFromDb() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        UserPayment payment = readyPayment(memberId, 1L, "document-coaching", "ORDER-P");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 1L))
                .willReturn(Optional.empty());
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(createTxService.createAndFlush(eq(memberId), eq(plan), any())).willReturn(payment);

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.amount()).isEqualTo(29000);
    }

    @Test
    @DisplayName("ACTIVE 구독이 있는 경우 동일 상품 차단")
    void createOrder_activeSubscriptionBlocked() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        Subscription active = subscription(memberId, UUID.randomUUID(), 1L, SubscriptionStatus.ACTIVE);
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(eq(memberId), eq(1L), any()))
                .willReturn(List.of(active));

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
    }

    @Test
    @DisplayName("CANCEL_SCHEDULED 동일 상품 차단")
    void createOrder_cancelScheduledBlocked() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        Subscription cs = subscription(memberId, UUID.randomUUID(), 1L, SubscriptionStatus.CANCEL_SCHEDULED);
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(eq(memberId), eq(1L), any()))
                .willReturn(List.of(cs));

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
    }

    @Test
    @DisplayName("PAYMENT_FAILED 동일 상품 차단")
    void createOrder_paymentFailedBlocked() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        Subscription pf = subscription(memberId, UUID.randomUUID(), 1L, SubscriptionStatus.PAYMENT_FAILED);
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(eq(memberId), eq(1L), any()))
                .willReturn(List.of(pf));

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.SUBSCRIPTION_ALREADY_ACTIVE);
    }

    @Test
    @DisplayName("다른 상품 ACTIVE 구독은 이 상품 구매를 차단하지 않음")
    void createOrder_otherProductSubscriptionAllowed() {
        Plan interviewPlan = plan(2L, "interview", "AI 모의면접", 29000);
        UserPayment payment = readyPayment(memberId, 2L, "interview", "ORDER-INT2");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("interview", true))
                .willReturn(Optional.of(interviewPlan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(eq(memberId), eq(2L), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 2L))
                .willReturn(Optional.empty());
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(createTxService.createAndFlush(eq(memberId), eq(interviewPlan), any())).willReturn(payment);

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("interview", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.productCode()).isEqualTo("interview");
    }

    @Test
    @DisplayName("계정 상태 비정상 — ACCOUNT_NOT_ELIGIBLE")
    void createOrder_accountNotEligible() {
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(false);

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE);
    }

    @Test
    @DisplayName("존재하지 않는 상품 — PRODUCT_NOT_FOUND")
    void createOrder_productNotFound() {
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("unknown", true))
                .willReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("unknown", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    @DisplayName("같은 상품·회원의 READY 주문이 있으면 새 row 없이 재사용하되 orderId 는 재발급 (Toss DUPLICATED 방지)")
    void createOrder_reuseRowWithFreshOrderId() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        UserPayment existing = readyPayment(memberId, 1L, "document-coaching", "ORDER-EXISTING");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 1L))
                .willReturn(Optional.of(existing));

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        // 새 주문 row 는 만들지 않되(멱등), 재사용 주문의 orderId 는 새로 발급한다.
        assertThat(response.orderId())
                .isNotEqualTo("ORDER-EXISTING")
                .startsWith("ORDER-");
        verify(createTxService, never()).createAndFlush(any(), any(), any());
    }

    @Test
    @DisplayName("getMemberBillingInfo가 BILLING_EMAIL_REQUIRED를 던지면 그대로 전파된다")
    void createOrder_emailRequired_propagates() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 1L))
                .willReturn(Optional.empty());
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willThrow(new CustomException(BillingErrorCode.BILLING_EMAIL_REQUIRED));

        assertThatThrownBy(() ->
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.BILLING_EMAIL_REQUIRED);
    }

    @Test
    @DisplayName("동시 요청으로 유니크 제약 위반 — 경쟁 스레드 주문을 잠금 readback 후 새 orderId 재발급")
    void createOrder_concurrentConflict_reissuesFreshOrderId() {
        Plan plan = plan(1L, "document-coaching", "서류 AI 코칭", 29000);
        UserPayment rivalPayment = readyPayment(memberId, 1L, "document-coaching", "ORDER-RIVAL");
        given(billingMemberPort.isEligibleForBilling(memberId)).willReturn(true);
        given(planRepository.findByProductCodeAndIsActive("document-coaching", true))
                .willReturn(Optional.of(plan));
        given(subscriptionRepository.findActiveLikeByMemberIdAndPlanId(any(), any(), any()))
                .willReturn(List.of());
        given(userPaymentRepository.findReadyByMemberIdAndPlanIdForUpdate(memberId, 1L))
                .willReturn(Optional.empty())           // 최초 조회(행 잠금): 없음
                .willReturn(Optional.of(rivalPayment)); // DataIntegrityViolation 후 잠금 readback: 경쟁 스레드 삽입 행
        given(billingMemberPort.getMemberBillingInfo(memberId))
                .willReturn(new BillingMemberPort.MemberBillingInfo("홍길동", "test@example.com"));
        given(createTxService.createAndFlush(any(), any(), any()))
                .willThrow(new DataIntegrityViolationException("uq_payments_member_plan_ready"));

        BillingDTO.ResponseCreateOrder response =
                service.createOrder(memberId, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        // 경쟁 주문 row 를 재사용하되 orderId 는 새로 발급 → 두 클라이언트가 같은 orderId 를 받지 않는다.
        assertThat(response.orderId())
                .isNotEqualTo("ORDER-RIVAL")
                .startsWith("ORDER-");
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Plan plan(Long id, String code, String name, int price) {
        Plan plan = Plan.create(code, name, price, 30, "KRW", "MONTHLY", true);
        setField(plan, "planId", id);
        return plan;
    }

    private Subscription subscription(UUID memberId, UUID id, Long planId, SubscriptionStatus status) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        Subscription sub = Subscription.create(memberId, planId, now.minusDays(1), now.plusDays(29));
        setField(sub, "subscriptionId", id);
        setField(sub, "subscriptionStatus", status);
        return sub;
    }

    private UserPayment readyPayment(UUID memberId, Long planId, String productCode, String orderId) {
        ZonedDateTime expiresAt = ZonedDateTime.now(KST).plusMinutes(30);
        return UserPayment.createReady(memberId, planId, productCode, orderId,
                UUID.randomUUID().toString(), UUID.randomUUID().toString(),
                "홍길동", "test@example.com", 29000, expiresAt);
    }

    private void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
