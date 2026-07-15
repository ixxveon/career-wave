package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RefundApprovalTxServiceTest {

    @InjectMocks
    private RefundApprovalTxService refundApprovalTxService;

    @Mock private PaymentRepository paymentRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private SubscriptionRepository subscriptionRepository;

    @Test
    @DisplayName("finalizeApproval() — 연결된 구독 있음 → REFUND_PENDING이던 구독을 REFUNDED로 전환")
    void finalizeApproval_withSubscription_marksRefunded() {
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        Payment payment = createPayment(paymentId, subscriptionId);
        Refund refund = createRefund(paymentId);
        Subscription subscription = newActiveSubscription();
        subscription.markRefundPending();

        given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
        given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
            .willReturn(Optional.of(refund));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
            .willReturn(Optional.of(subscription));

        RefundDTO.ResponseApprove result = refundApprovalTxService.finalizeApproval(paymentId, 1L);

        assertThat(result.refundStatus()).isEqualTo(RefundStatus.COMPLETED);
        assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUNDED);
    }

    @Test
    @DisplayName("finalizeApproval() — 연결된 구독 없음(subscriptionId null) → 구독 조회 시도하지 않음")
    void finalizeApproval_withoutSubscription_skipsSubscriptionLookup() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = createPayment(paymentId, null);
        Refund refund = createRefund(paymentId);

        given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
        given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
            .willReturn(Optional.of(refund));

        refundApprovalTxService.finalizeApproval(paymentId, 1L);

        verify(subscriptionRepository, never()).findBySubscriptionIdForUpdate(any());
    }

    @Test
    @DisplayName("finalizeApproval() — 구독이 REFUND_PENDING이 아니면(레거시 상태) 전이 예외로 롤백 — 정상 경로는 자동 치유하지 않음")
    void finalizeApproval_subscriptionNotRefundPending_throwsAndDoesNotHeal() {
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        Payment payment = createPayment(paymentId, subscriptionId);
        Refund refund = createRefund(paymentId);
        Subscription subscription = newActiveSubscription(); // REFUND_PENDING으로 전이 안 된 채 ACTIVE 상태

        given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
        given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
            .willReturn(Optional.of(refund));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
            .willReturn(Optional.of(subscription));

        assertThatThrownBy(() -> refundApprovalTxService.finalizeApproval(paymentId, 1L))
            .isInstanceOf(CustomException.class)
            .extracting(e -> ((CustomException) e).getErrorCode())
            .isEqualTo(kr.co.carrer.user.billing.exception.BillingErrorCode.SUBSCRIPTION_INVALID_TRANSITION);
        assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    @Test
    @DisplayName("finalizeManualApproval() — 구독이 REFUND_PENDING 아직 아님(#1312 이전 레거시) → REFUND_PENDING 거쳐 REFUNDED로 자동 치유")
    void finalizeManualApproval_legacyActiveSubscription_healsThroughRefundPending() {
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        Payment payment = createPayment(paymentId, subscriptionId);
        Refund refund = createRefund(paymentId);
        Subscription subscription = newActiveSubscription(); // REFUND_PENDING 미전이 상태

        given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
        given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
            .willReturn(Optional.of(refund));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
            .willReturn(Optional.of(subscription));

        RefundDTO.ResponseApprove result = refundApprovalTxService.finalizeManualApproval(paymentId, 1L);

        assertThat(result.refundStatus()).isEqualTo(RefundStatus.COMPLETED);
        assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUNDED);
    }

    @Test
    @DisplayName("finalizeManualApproval() — 이미 REFUND_PENDING인 구독 → 정상 경로와 동일하게 REFUNDED로 확정")
    void finalizeManualApproval_alreadyRefundPending_marksRefunded() {
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        Payment payment = createPayment(paymentId, subscriptionId);
        Refund refund = createRefund(paymentId);
        Subscription subscription = newActiveSubscription();
        subscription.markRefundPending();

        given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
        given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
            .willReturn(Optional.of(refund));
        given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
            .willReturn(Optional.of(subscription));

        RefundDTO.ResponseApprove result = refundApprovalTxService.finalizeManualApproval(paymentId, 1L);

        assertThat(result.refundStatus()).isEqualTo(RefundStatus.COMPLETED);
        assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUNDED);
    }

    private Subscription newActiveSubscription() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        return Subscription.create(UUID.randomUUID(), 1L, now, now.plusMonths(1));
    }

    private Payment createPayment(UUID paymentId, UUID subscriptionId) {
        try {
            var constructor = Payment.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Payment payment = constructor.newInstance();
            setField(payment, "paymentId", paymentId);
            setField(payment, "paymentStatus", PaymentStatus.PAID);
            setField(payment, "subscriptionId", subscriptionId);
            return payment;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Refund createRefund(UUID paymentId) {
        try {
            var constructor = Refund.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Refund refund = constructor.newInstance();
            setField(refund, "paymentId", paymentId);
            setField(refund, "refundStatus", RefundStatus.PENDING);
            setField(refund, "amount", 9900);
            setField(refund, "reason", "구매 취소");
            return refund;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
