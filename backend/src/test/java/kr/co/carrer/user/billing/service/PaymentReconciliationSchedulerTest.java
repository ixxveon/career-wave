package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.scheduler.PaymentReconciliationScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationSchedulerTest {

    @Mock PaymentReconciliationService paymentReconciliationService;

    private PaymentReconciliationScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new PaymentReconciliationScheduler(paymentReconciliationService);
    }

    @Test
    @DisplayName("reconcile() 호출 시 reconcileAll() 위임")
    void reconcile_delegatesToService() {
        scheduler.reconcile();

        verify(paymentReconciliationService).reconcileAll();
    }

    @Test
    @DisplayName("reconcileAll() 예외 발생해도 scheduler 중단되지 않음")
    void reconcile_serviceThrows_schedulerDoesNotPropagate() {
        doThrow(new RuntimeException("DB 연결 오류")).when(paymentReconciliationService).reconcileAll();

        // 예외가 전파되지 않아야 함 (scheduler 자체가 죽으면 안 됨)
        scheduler.reconcile();

        verify(paymentReconciliationService).reconcileAll();
    }

    @Test
    @DisplayName("중복 호출 — 각 호출마다 reconcileAll() 1회씩 실행 (중복 등록 없음)")
    void reconcile_calledTwice_eachCallInvokesServiceOnce() {
        scheduler.reconcile();
        scheduler.reconcile();

        verify(paymentReconciliationService, times(2)).reconcileAll();
    }
}
