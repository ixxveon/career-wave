package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
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
