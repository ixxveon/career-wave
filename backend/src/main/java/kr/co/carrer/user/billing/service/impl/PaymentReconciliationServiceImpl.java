package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.client.TossPaymentQueryClient;
import kr.co.carrer.user.billing.client.dto.TossBillingPaymentResponse;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.PaymentReconciliationService;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReconciliationServiceImpl implements PaymentReconciliationService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Value("${billing.reconciliation.max-minutes:30}")
    private int maxReconciliationMinutes;

    private final UserPaymentRepository userPaymentRepository;
    private final TossPaymentQueryClient tossPaymentQueryClient;
    private final PaymentReconciliationTxService reconciliationTxService;
    private final UserPaymentFailureTxService failureTxService;

    @Override
    @Transactional
    public void reconcileAll() {
        List<UserPayment> reconcilingPayments = userPaymentRepository.findReconcilingPaymentsForUpdate();
        if (reconcilingPayments.isEmpty()) return;

        log.info("RECONCILING 대사 시작: {}건", reconcilingPayments.size());
        int settled = 0, failed = 0, pending = 0;

        for (UserPayment payment : reconcilingPayments) {
            try {
                ReconcileOutcome outcome = processOne(payment);
                switch (outcome) {
                    case PAID -> settled++;
                    case FAILED -> failed++;
                    case PENDING -> pending++;
                }
            } catch (Exception e) {
                log.warn("RECONCILING 처리 예외: paymentId={}, error={}", payment.getPaymentId(), e.getMessage());
            }
        }

        log.info("RECONCILING 대사 완료: 복구={}, 실패확정={}, 대기유지={}", settled, failed, pending);
    }

    private ReconcileOutcome processOne(UserPayment payment) {
        // 최대 대사 시간 초과 → 운영 알림 로그 (처리는 계속 대기)
        if (isMaxTimeExceeded(payment)) {
            log.warn("[OPS-ALERT] RECONCILING 최대 시간({} 분) 초과: paymentId={}, orderId={}, reconcilingAt={}",
                    maxReconciliationMinutes, payment.getPaymentId(), payment.getOrderId(),
                    payment.getReconcilingAt());
            return ReconcileOutcome.PENDING;
        }

        Optional<TossBillingPaymentResponse> tossResult = tossPaymentQueryClient.queryByOrderId(payment.getOrderId());

        if (tossResult.isEmpty()) {
            // Toss 조회 실패 또는 timeout → RECONCILING 유지
            log.info("RECONCILING 유지: paymentId={} — Toss 조회 실패/timeout", payment.getPaymentId());
            return ReconcileOutcome.PENDING;
        }

        TossBillingPaymentResponse tossResponse = tossResult.get();
        if ("DONE".equals(tossResponse.status())) {
            reconciliationTxService.reconcileAsPaid(payment, tossResponse);
            return ReconcileOutcome.PAID;
        } else {
            // CANCELED, ABORTED, EXPIRED, PARTIAL_CANCELED → 실패 확정
            log.info("RECONCILING → FAILED: paymentId={}, tossStatus={}", payment.getPaymentId(), tossResponse.status());
            failureTxService.failPayment(payment.getPaymentId(), PaymentFailureReason.CONFIRM_FAILED);
            return ReconcileOutcome.FAILED;
        }
    }

    private boolean isMaxTimeExceeded(UserPayment payment) {
        ZonedDateTime reconcilingAt = payment.getReconcilingAt();
        if (reconcilingAt == null) return false;
        Duration elapsed = Duration.between(reconcilingAt.withZoneSameInstant(KST), ZonedDateTime.now(KST));
        return elapsed.toMinutes() >= maxReconciliationMinutes;
    }

    private enum ReconcileOutcome {
        PAID, FAILED, PENDING
    }
}
