package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.payment.client.PaymentCancelClient;
import kr.co.carrer.admin.payment.client.dto.TossCancelResponse;
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
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminPaymentServiceImplTest {

    @InjectMocks
    private AdminPaymentServiceImpl adminPaymentService;

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentQueryRepository paymentQueryRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private PaymentCancelClient paymentCancelClient;
    @Mock private RefundFailureTxService refundFailureTxService;
    @Mock private RefundApprovalTxService refundApprovalTxService;
    @Mock private AuditLogRepository auditLogRepository;

    // ── createRefundRequest ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("환불 요청 등록 - createRefundRequest()")
    class CreateRefundRequest {

        @Test
        @DisplayName("연결된 구독 있음 → 구독 상태를 REFUND_PENDING으로 전환")
        void createRefundRequest_withSubscription_marksRefundPending() throws Exception {
            UUID paymentId = UUID.randomUUID();
            UUID subscriptionId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            setField(payment, "subscriptionId", subscriptionId);
            setField(payment, "amount", 9900);
            Subscription subscription = newActiveSubscription();

            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.existsByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(false);
            given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(subscription));

            adminPaymentService.createRefundRequest(paymentId, "구매 취소", 1L);

            assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.REFUND_PENDING);
        }

        @Test
        @DisplayName("연결된 구독 없음(subscriptionId null) → 구독 조회 시도하지 않음")
        void createRefundRequest_withoutSubscription_skipsSubscriptionLookup() throws Exception {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            setField(payment, "amount", 9900);

            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.existsByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(false);

            adminPaymentService.createRefundRequest(paymentId, "구매 취소", 1L);

            verify(subscriptionRepository, never()).findBySubscriptionIdForUpdate(any());
        }
    }

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

        // Toss 취소 호출 전/후 DB 읽기·쓰기는 RefundApprovalTxService(별도 빈)의
        // 트랜잭션 메서드로 분리되어 있음 — approveRefund 자체는 이 두 메서드와
        // paymentCancelClient만 오케스트레이션한다. 그래서 이 테스트들은 repository를
        // 직접 스텁하지 않고 refundApprovalTxService를 스텁한다.

        @Test
        @DisplayName("PAID 결제 + PENDING 환불 → Toss 취소 호출 후 CANCELED / COMPLETED 반환")
        void approveRefund_success() {
            UUID paymentId = UUID.randomUUID();
            RefundApprovalTxService.CancelRequest cancelRequest =
                new RefundApprovalTxService.CancelRequest("test_payment_key", "구매 취소", 9900);
            RefundDTO.ResponseApprove expected =
                new RefundDTO.ResponseApprove(paymentId.toString(), PaymentStatus.REFUNDED, RefundStatus.COMPLETED);

            given(refundApprovalTxService.prepareCancel(paymentId)).willReturn(cancelRequest);
            given(paymentCancelClient.cancel("test_payment_key", "구매 취소", 9900))
                .willReturn(new TossCancelResponse("test_payment_key", "CANCELED"));
            given(refundApprovalTxService.finalizeApproval(paymentId, 1L)).willReturn(expected);

            RefundDTO.ResponseApprove result = adminPaymentService.approveRefund(paymentId, 1L, "MASTER");

            assertThat(result).isEqualTo(expected);
            verify(paymentCancelClient).cancel("test_payment_key", "구매 취소", 9900);
            verify(refundApprovalTxService).finalizeApproval(paymentId, 1L);
            verify(refundFailureTxService, never()).saveRefundFailed(any(), any());
        }

        @Test
        @DisplayName("Toss 결제 키 없음 → PAYMENT_INVALID_PARAM 예외, Toss 취소 미호출")
        void approveRefund_missingPaymentKey_throwsInvalidParam() {
            UUID paymentId = UUID.randomUUID();
            given(refundApprovalTxService.prepareCancel(paymentId))
                .willThrow(new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
            verify(paymentCancelClient, never()).cancel(any(), any(), anyInt());
        }

        @Test
        @DisplayName("Toss 취소 확정 실패(4xx) → TOSS_REFUND_FAILED 예외, 환불 실패 이력 별도 저장")
        void approveRefund_tossCancelFails_throwsAndSavesFailure() {
            UUID paymentId = UUID.randomUUID();
            RefundApprovalTxService.CancelRequest cancelRequest =
                new RefundApprovalTxService.CancelRequest("test_payment_key", "구매 취소", 9900);

            given(refundApprovalTxService.prepareCancel(paymentId)).willReturn(cancelRequest);
            given(paymentCancelClient.cancel("test_payment_key", "구매 취소", 9900))
                .willThrow(new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.TOSS_REFUND_FAILED);

            verify(refundFailureTxService).saveRefundFailed(paymentId, 1L);
            verify(refundApprovalTxService, never()).finalizeApproval(any(), any());
        }

        @Test
        @DisplayName("Toss 취소 결과 불확실(5xx/timeout) → TOSS_REFUND_AMBIGUOUS 예외, 실패 이력 미저장(PENDING 유지)")
        void approveRefund_tossCancelAmbiguous_throwsWithoutMarkingFailed() {
            UUID paymentId = UUID.randomUUID();
            RefundApprovalTxService.CancelRequest cancelRequest =
                new RefundApprovalTxService.CancelRequest("test_payment_key", "구매 취소", 9900);

            given(refundApprovalTxService.prepareCancel(paymentId)).willReturn(cancelRequest);
            given(paymentCancelClient.cancel("test_payment_key", "구매 취소", 9900))
                .willThrow(new CustomException(AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS);

            // 불확실한 실패는 확정 FAILED로 기록하지 않는다 — Toss가 실제로는 취소를
            // 처리했을 수도 있는 상태이기 때문. 환불은 PENDING으로 남아 수동 확인 대상이 된다.
            verify(refundFailureTxService, never()).saveRefundFailed(any(), any());
            verify(refundApprovalTxService, never()).finalizeApproval(any(), any());
        }

        @Test
        @DisplayName("존재하지 않는 결제 ID → PAYMENT_NOT_FOUND 예외")
        void approveRefund_paymentNotFound() {
            UUID paymentId = UUID.randomUUID();
            given(refundApprovalTxService.prepareCancel(paymentId))
                .willThrow(new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_FOUND);
        }

        @Test
        @DisplayName("결제 상태가 PAID 아님 → PAYMENT_NOT_REFUNDABLE 예외")
        void approveRefund_notPaid_throwsPaymentNotRefundable() {
            UUID paymentId = UUID.randomUUID();
            given(refundApprovalTxService.prepareCancel(paymentId))
                .willThrow(new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE);
        }

        @Test
        @DisplayName("CS 역할 → REFUND_APPROVAL_FORBIDDEN 예외, 조회조차 시도하지 않는다")
        void approveRefund_csRole_throwsForbidden() {
            UUID paymentId = UUID.randomUUID();

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "CS"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_APPROVAL_FORBIDDEN);
            verify(refundApprovalTxService, never()).prepareCancel(any());
        }

        @Test
        @DisplayName("PENDING 환불 없음 → REFUND_NOT_PENDING 예외")
        void approveRefund_noPendingRefund_throwsRefundNotPending() {
            UUID paymentId = UUID.randomUUID();
            given(refundApprovalTxService.prepareCancel(paymentId))
                .willThrow(new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

            assertThatThrownBy(() -> adminPaymentService.approveRefund(paymentId, 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_NOT_PENDING);
        }
    }

    // ── manualConfirmRefund ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("환불 수동 확정 처리 - manualConfirmRefund()")
    class ManualConfirmRefund {

        @Test
        @DisplayName("MASTER 역할 → Toss 호출 없이 finalizeManualApproval만 위임, 감사 로그 기록")
        void manualConfirmRefund_success_skipsTossCall() {
            UUID paymentId = UUID.randomUUID();
            RefundDTO.ResponseApprove expected =
                new RefundDTO.ResponseApprove(paymentId.toString(), PaymentStatus.REFUNDED, RefundStatus.COMPLETED);

            given(refundApprovalTxService.finalizeManualApproval(paymentId, 1L)).willReturn(expected);

            RefundDTO.ResponseApprove result =
                adminPaymentService.manualConfirmRefund(paymentId, 1L, "MASTER", "127.0.0.1");

            assertThat(result).isEqualTo(expected);
            verify(refundApprovalTxService).finalizeManualApproval(paymentId, 1L);
            verify(paymentCancelClient, never()).cancel(any(), any(), anyInt());
            verify(refundApprovalTxService, never()).prepareCancel(any());
            verify(auditLogRepository).save(any());
        }

        @Test
        @DisplayName("CS 역할 → REFUND_APPROVAL_FORBIDDEN 예외, finalizeManualApproval 호출 안 됨")
        void manualConfirmRefund_csRole_throwsForbidden() {
            UUID paymentId = UUID.randomUUID();

            assertThatThrownBy(() -> adminPaymentService.manualConfirmRefund(paymentId, 1L, "CS", "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_APPROVAL_FORBIDDEN);
            verify(refundApprovalTxService, never()).finalizeManualApproval(any(), any());
            verify(auditLogRepository, never()).save(any());
        }

        @Test
        @DisplayName("PENDING 환불 없음 → REFUND_NOT_PENDING 예외, 감사 로그 기록 안 됨")
        void manualConfirmRefund_noPendingRefund_throwsRefundNotPending() {
            UUID paymentId = UUID.randomUUID();
            given(refundApprovalTxService.finalizeManualApproval(paymentId, 1L))
                .willThrow(new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

            assertThatThrownBy(() -> adminPaymentService.manualConfirmRefund(paymentId, 1L, "MASTER", "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_NOT_PENDING);
            verify(auditLogRepository, never()).save(any());
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

            RefundDTO.ResponseReject result = adminPaymentService.rejectRefund(paymentId, "정책 위반", 1L, "MASTER");

            assertThat(result.refundStatus()).isEqualTo(RefundStatus.REJECTED);
            verify(refundRepository).save(refund);
        }

        @Test
        @DisplayName("연결된 구독 있음 → REFUND_PENDING이던 구독을 ACTIVE로 복귀")
        void rejectRefund_withSubscription_revertsToActive() throws Exception {
            UUID paymentId = UUID.randomUUID();
            UUID subscriptionId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            setField(payment, "subscriptionId", subscriptionId);
            Refund refund = createRefund(paymentId, RefundStatus.PENDING);
            Subscription subscription = newActiveSubscription();
            subscription.markRefundPending();

            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.of(refund));
            given(subscriptionRepository.findBySubscriptionIdForUpdate(subscriptionId))
                .willReturn(Optional.of(subscription));

            adminPaymentService.rejectRefund(paymentId, "정책 위반", 1L, "MASTER");

            assertThat(subscription.getSubscriptionStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        }

        @Test
        @DisplayName("존재하지 않는 결제 ID → PAYMENT_NOT_FOUND 예외")
        void rejectRefund_paymentNotFound() {
            UUID paymentId = UUID.randomUUID();
            given(paymentRepository.findById(paymentId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "사유", 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.PAYMENT_NOT_FOUND);
        }

        @Test
        @DisplayName("CS 역할 → REFUND_APPROVAL_FORBIDDEN 예외")
        void rejectRefund_csRole_throwsForbidden() {
            UUID paymentId = UUID.randomUUID();

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "사유", 1L, "CS"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_APPROVAL_FORBIDDEN);
        }

        @Test
        @DisplayName("PENDING 환불 없음 → REFUND_NOT_PENDING 예외")
        void rejectRefund_noPendingRefund_throwsRefundNotPending() {
            UUID paymentId = UUID.randomUUID();
            Payment payment = createPayment(paymentId, PaymentStatus.PAID);
            given(paymentRepository.findById(paymentId)).willReturn(Optional.of(payment));
            given(refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> adminPaymentService.rejectRefund(paymentId, "정책 위반", 1L, "MASTER"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminPaymentErrorCode.REFUND_NOT_PENDING);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Subscription newActiveSubscription() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        return Subscription.create(UUID.randomUUID(), 1L, now, now.plusMonths(1));
    }

    private Payment createPayment(UUID paymentId, PaymentStatus status) {
        return createPayment(paymentId, status, "test_payment_key");
    }

    private Payment createPayment(UUID paymentId, PaymentStatus status, String paymentKey) {
        try {
            var constructor = Payment.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Payment payment = constructor.newInstance();
            setField(payment, "paymentId", paymentId);
            setField(payment, "paymentStatus", status);
            setField(payment, "paymentKey", paymentKey);
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
