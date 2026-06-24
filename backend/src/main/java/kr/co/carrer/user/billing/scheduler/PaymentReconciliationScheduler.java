package kr.co.carrer.user.billing.scheduler;

import kr.co.carrer.user.billing.service.PaymentReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// RECONCILING 결제 대사 스케줄러
// 5분마다 RECONCILING 상태 결제를 Toss에 조회하여 PAID 또는 FAILED로 확정
// 인터벌: billing.reconciliation.max-minutes (application.yml)
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentReconciliationScheduler {

    private final PaymentReconciliationService paymentReconciliationService;

    @Scheduled(fixedDelayString = "${billing.reconciliation.interval-ms:300000}", initialDelay = 60000)
    public void reconcile() {
        try {
            paymentReconciliationService.reconcileAll();
        } catch (Exception e) {
            log.error("RECONCILING 스케줄러 예외: {}", e.getMessage(), e);
        }
    }
}
