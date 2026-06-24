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

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    // @Transactional 없음 — 외부 Toss API 호출 중 DB 락 점유 방지
    // 1. 짧은 TX로 paymentId 목록만 수집
    // 2. 각 건 처리 시 Toss 호출(TX 밖) → 상태 확정 시 건별 REQUIRES_NEW TX
    @Override
    public void reconcileAll() {
        List<UUID> paymentIds = userPaymentRepository.findReconcilingPaymentIds();
        if (paymentIds.isEmpty()) return;

        log.info("RECONCILING 대사 시작: {}건", paymentIds.size());
        int settled = 0, failed = 0, pending = 0;

        for (UUID paymentId : paymentIds) {
            try {
                ReconcileOutcome outcome = processOne(paymentId);
                switch (outcome) {
                    case PAID -> settled++;
                    case FAILED -> failed++;
                    case PENDING -> pending++;
                }
            } catch (Exception e) {
                log.warn("RECONCILING 처리 예외: paymentId={}, error={}", paymentId, e.getMessage());
            }
        }

        log.info("RECONCILING 대사 완료: 복구={}, 실패확정={}, 대기유지={}", settled, failed, pending);
    }

    private ReconcileOutcome processOne(UUID paymentId) {
        // 결제 상세 읽기 — 락 없는 단순 조회 (외부 API 호출 전)
        UserPayment payment = userPaymentRepository.findById(paymentId).orElse(null);
        if (payment == null) return ReconcileOutcome.PENDING;

        if (isMaxTimeExceeded(payment)) {
            log.warn("[OPS-ALERT] RECONCILING 최대 시간({} 분) 초과: paymentId={}, orderId={}, reconcilingAt={}",
                    maxReconciliationMinutes, paymentId, payment.getOrderId(),
                    payment.getReconcilingAt());
            return ReconcileOutcome.PENDING;
        }

        Optional<TossBillingPaymentResponse> tossResult = tossPaymentQueryClient.queryByOrderId(payment.getOrderId());

        if (tossResult.isEmpty()) {
            // Toss 조회 실패 또는 timeout → RECONCILING 유지
            log.info("RECONCILING 유지: paymentId={} — Toss 조회 실패/timeout", paymentId);
            return ReconcileOutcome.PENDING;
        }

        TossBillingPaymentResponse tossResponse = tossResult.get();
        if ("DONE".equals(tossResponse.status())) {
            // REQUIRES_NEW TX 내에서 재조회/락 후 PAID 확정
            reconciliationTxService.reconcileAsPaid(paymentId, tossResponse);
            return ReconcileOutcome.PAID;
        } else {
            // CANCELED, ABORTED, EXPIRED, PARTIAL_CANCELED → 실패 확정
            log.info("RECONCILING → FAILED: paymentId={}, tossStatus={}", paymentId, tossResponse.status());
            failureTxService.failPayment(paymentId, PaymentFailureReason.CONFIRM_FAILED);
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
