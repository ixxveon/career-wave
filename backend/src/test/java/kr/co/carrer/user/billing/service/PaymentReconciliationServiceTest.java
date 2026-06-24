package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.client.TossPaymentQueryClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.impl.PaymentReconciliationServiceImpl;
import kr.co.carrer.user.billing.service.impl.PaymentReconciliationTxService;
import kr.co.carrer.user.billing.service.impl.UserPaymentFailureTxService;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationServiceTest {

    @Mock UserPaymentRepository userPaymentRepository;
    @Mock TossPaymentQueryClient tossPaymentQueryClient;
    @Mock PaymentReconciliationTxService reconciliationTxService;
    @Mock UserPaymentFailureTxService failureTxService;

    private PaymentReconciliationServiceImpl service;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @BeforeEach
    void setUp() {
        service = new PaymentReconciliationServiceImpl(
                userPaymentRepository, tossPaymentQueryClient,
                reconciliationTxService, failureTxService);
        ReflectionTestUtils.setField(service, "maxReconciliationMinutes", 30);
        ReflectionTestUtils.setField(service, "batchSize", 50);
    }

    @Test
    @DisplayName("RECONCILING 없음 → 아무것도 호출 안 함")
    void reconcileAll_noReconcilingPayments_doesNothing() {
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class))).willReturn(List.of());

        service.reconcileAll();

        verifyNoInteractions(tossPaymentQueryClient, reconciliationTxService, failureTxService);
    }

    @Test
    @DisplayName("Toss DONE → reconcileAsPaid 호출")
    void reconcileAll_tossDone_callsReconcileAsPaid() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));

        TossBillingPaymentResponse tossResponse = new TossBillingPaymentResponse(
                "pk_test", payment.getOrderId(), "DONE", 29000, "KRW", ZonedDateTime.now(KST));
        given(tossPaymentQueryClient.queryByOrderId(payment.getOrderId()))
                .willReturn(Optional.of(tossResponse));

        service.reconcileAll();

        verify(reconciliationTxService).reconcileAsPaid(payment.getPaymentId(), tossResponse);
        verify(failureTxService, never()).failPayment(any(), any());
    }

    @Test
    @DisplayName("Toss CANCELED(터미널) → failPayment 호출")
    void reconcileAll_tossCanceled_callsFailPayment() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));

        TossBillingPaymentResponse tossResponse = new TossBillingPaymentResponse(
                null, payment.getOrderId(), "CANCELED", 0, "KRW", null);
        given(tossPaymentQueryClient.queryByOrderId(payment.getOrderId()))
                .willReturn(Optional.of(tossResponse));

        service.reconcileAll();

        verify(failureTxService).failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
        verify(reconciliationTxService, never()).reconcileAsPaid(any(UUID.class), any());
    }

    @Test
    @DisplayName("Toss IN_PROGRESS(비터미널) → RECONCILING 유지 (failPayment/settle 미호출)")
    void reconcileAll_tossInProgress_keepsReconciling() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));

        TossBillingPaymentResponse tossResponse = new TossBillingPaymentResponse(
                null, payment.getOrderId(), "IN_PROGRESS", 0, "KRW", null);
        given(tossPaymentQueryClient.queryByOrderId(payment.getOrderId()))
                .willReturn(Optional.of(tossResponse));

        service.reconcileAll();

        verify(failureTxService, never()).failPayment(any(), any());
        verify(reconciliationTxService, never()).reconcileAsPaid(any(UUID.class), any());
    }

    @Test
    @DisplayName("Toss 4xx(영구 실패) → BILLING_ORDER_NOT_FOUND 예외 → failPayment 호출")
    void reconcileAll_toss4xx_callsFailPayment() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(tossPaymentQueryClient.queryByOrderId(payment.getOrderId()))
                .willThrow(new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        service.reconcileAll();

        verify(failureTxService).failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
        verify(reconciliationTxService, never()).reconcileAsPaid(any(UUID.class), any());
    }

    @Test
    @DisplayName("Toss 조회 timeout(empty) → RECONCILING 유지 (failPayment/settle 미호출)")
    void reconcileAll_tossTimeout_keepsReconciling() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));
        given(tossPaymentQueryClient.queryByOrderId(any())).willReturn(Optional.empty());

        service.reconcileAll();

        verify(failureTxService, never()).failPayment(any(), any());
        verify(reconciliationTxService, never()).reconcileAsPaid(any(UUID.class), any());
    }

    @Test
    @DisplayName("최대 대사 시간 초과 → RECONCILING 유지 + Toss 조회 미실행 (OPS 알림)")
    void reconcileAll_maxTimeExceeded_keepsReconcilingWithoutTossQuery() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(31));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));

        service.reconcileAll();

        verify(tossPaymentQueryClient, never()).queryByOrderId(any());
        verify(failureTxService, never()).failPayment(any(), any());
    }

    @Test
    @DisplayName("여러 RECONCILING 건 중 일부 성공, 일부 실패 — 예외 격리됨")
    void reconcileAll_mixed_exceptionIsolated() {
        UserPayment p1 = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(5));
        UserPayment p2 = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(3));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(p1.getPaymentId(), p2.getPaymentId()));
        given(userPaymentRepository.findById(p1.getPaymentId())).willReturn(Optional.of(p1));
        given(userPaymentRepository.findById(p2.getPaymentId())).willReturn(Optional.of(p2));

        TossBillingPaymentResponse done = new TossBillingPaymentResponse(
                "pk", p1.getOrderId(), "DONE", 29000, "KRW", ZonedDateTime.now(KST));
        given(tossPaymentQueryClient.queryByOrderId(p1.getOrderId())).willReturn(Optional.of(done));
        given(tossPaymentQueryClient.queryByOrderId(p2.getOrderId()))
                .willThrow(new RuntimeException("Unexpected error"));

        service.reconcileAll();

        verify(reconciliationTxService).reconcileAsPaid(p1.getPaymentId(), done);
    }

    @Test
    @DisplayName("Toss ABORTED(터미널) → failPayment 호출")
    void reconcileAll_tossAborted_callsFailPayment() {
        UserPayment payment = reconcilingPayment(ZonedDateTime.now(KST).minusMinutes(2));
        given(userPaymentRepository.findReconcilingPaymentIds(any(Pageable.class)))
                .willReturn(List.of(payment.getPaymentId()));
        given(userPaymentRepository.findById(payment.getPaymentId())).willReturn(Optional.of(payment));

        TossBillingPaymentResponse tossResponse = new TossBillingPaymentResponse(
                null, payment.getOrderId(), "ABORTED", 0, "KRW", null);
        given(tossPaymentQueryClient.queryByOrderId(payment.getOrderId()))
                .willReturn(Optional.of(tossResponse));

        service.reconcileAll();

        verify(failureTxService).failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private UserPayment reconcilingPayment(ZonedDateTime reconcilingAt) {
        UserPayment p = UserPayment.createReady(
                UUID.randomUUID(), 1L, "document-coaching",
                "ORDER-" + UUID.randomUUID(), UUID.randomUUID().toString(),
                UUID.randomUUID().toString(), "테스트", "test@example.com", 29000,
                ZonedDateTime.now(KST).plusMinutes(30));
        // @PrePersist는 실제 저장 시점에만 호출되므로 테스트에서 직접 할당
        setField(p, "paymentId", UUID.randomUUID());
        p.markForReconciliation();
        setField(p, "reconcilingAt", reconcilingAt);
        return p;
    }

    private void setField(Object target, String name, Object value) {
        try {
            Class<?> clazz = target.getClass();
            while (clazz != null) {
                try {
                    Field field = clazz.getDeclaredField(name);
                    field.setAccessible(true);
                    field.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    clazz = clazz.getSuperclass();
                }
            }
            throw new NoSuchFieldException(name);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
