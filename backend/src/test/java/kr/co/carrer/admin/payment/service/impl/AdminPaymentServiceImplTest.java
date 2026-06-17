package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.repository.PaymentQueryRepository;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminPaymentServiceImplTest {

    @InjectMocks
    private AdminPaymentServiceImpl adminPaymentService;

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentQueryRepository paymentQueryRepository;
    @Mock private RefundRepository refundRepository;

    // ── getSummary ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("KPI 집계 조회 - getSummary()")
    class GetSummary {

        @Test
        @DisplayName("총 매출·결제 건수·환불 대기·결제 실패 집계 성공")
        void getSummary_success() {
            given(paymentRepository.sumPaidAmount()).willReturn(300000L);
            given(paymentRepository.countByPaymentStatus(PaymentStatus.PAID)).willReturn(15L);
            given(paymentRepository.countRefundPending()).willReturn(3L);
            given(paymentRepository.countByPaymentStatus(PaymentStatus.FAILED)).willReturn(2L);

            PaymentDTO.ResponseSummary result = adminPaymentService.getSummary();

            assertThat(result.totalRevenue()).isEqualTo(300000L);
            assertThat(result.paidCount()).isEqualTo(15L);
            assertThat(result.refundPendingCount()).isEqualTo(3L);
            assertThat(result.failedCount()).isEqualTo(2L);
        }
    }

    // ── approveRefund ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("환불 확정 처리 - approveRefund()")
    class ApproveRefund {

        @Test
        @DisplayName("PAID 결제 + PENDING 환불 → CANCELED / COMPLETED 반환")
        void approveRefund_success() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            Refund refund = createRefund(paymentId, RefundStatus.PENDING);

            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.of(refund));

            RefundDTO.ResponseApprove result = adminPaymentService.approveRefund(paymentId, 1L);

            assertThat(result.paymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
            assertThat(result.refundStatus()).isEqualTo(RefundStatus.COMPLETED);
            verify(refundRepository).save(refund);
            verify(paymentRepository).save(payment);
        }

        @Test
        @DisplayName("존재하지 않는 결제 ID → PAYMENT_NOT_FOUND 예외")
        void approveRefund_paymentNotFound() {
            UUID paymentId = UUID.randomUUID();
            given(paymentRepository.findById(paymentId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_FOUND);
        }

        @Test
        @DisplayName("결제 상태가 PAID 아님 → PAYMENT_NOT_REFUNDABLE 예외")
        void approveRefund_notPaid_throwsPaymentNotRefundable() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.FAILED);
            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE);
        }

        @Test
        @DisplayName("PENDING 환불 없음 → REFUND_NOT_PENDING 예외")
        void approveRefund_noPendingRefund_throwsRefundNotPending() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_NOT_PENDING);
        }
    }

    // ── rejectRefund ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("환불 불가 처리 - rejectRefund()")
    class RejectRefund {

        @Test
        @DisplayName("PENDING 환불 + 거절 사유 있음 → REJECTED 반환")
        void rejectRefund_success() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            Refund refund = createRefund(paymentId, RefundStatus.PENDING);

            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.of(refund));

            RefundDTO.ResponseReject result = adminPaymentService.rejectRefund(paymentId, "정책 위반", 1L);

            assertThat(result.refundStatus()).isEqualTo(RefundStatus.REJECTED);
            verify(refundRepository).save(refund);
        }

        @Test
        @DisplayName("존재하지 않는 결제 ID → PAYMENT_NOT_FOUND 예외")
        void rejectRefund_paymentNotFound() {
            UUID paymentId = UUID.randomUUID();
            given(paymentRepository.findById(paymentId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "사유", 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_FOUND);
        }

        @Test
        @DisplayName("거절 사유 공백 → REJECT_REASON_REQUIRED 예외")
        void rejectRefund_blankReason_throwsRejectReasonRequired() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "   ", 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REJECT_REASON_REQUIRED);
        }

        @Test
        @DisplayName("PENDING 환불 없음 → REFUND_NOT_PENDING 예외")
        void rejectRefund_noPendingRefund_throwsRefundNotPending() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "정책 위반", 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_NOT_PENDING);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Payment createPayment(UUID paymentId, PaymentStatus status) {
        try {
            var constructor = Payment.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Payment payment = constructor.newInstance();
            setField(payment, "paymentId", paymentId);
            setField(payment, "paymentStatus", status);
            return payment;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Refund createRefund(UUID paymentId, RefundStatus status) {
        try {
            var constructor = Refund.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Refund refund = constructor.newInstance();
            setField(refund, "paymentId", paymentId);
            setField(refund, "refundStatus", status);
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
