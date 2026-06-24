package kr.co.carrer.user.billing.scheduler;

import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

// 30분 미결제 READY 주문을 CANCELED로 전이 — 5분 간격 실행
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderExpirationScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserPaymentRepository userPaymentRepository;

    @Scheduled(fixedRate = 300_000)
    @Transactional
    public void expireStaleOrders() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        List<UserPayment> expired = userPaymentRepository.findExpiredReadyOrders(now);
        if (expired.isEmpty()) return;

        int count = 0;
        for (UserPayment payment : expired) {
            try {
                payment.cancel();
                count++;
            } catch (Exception e) {
                log.warn("주문 만료 전이 실패: orderId={}", payment.getOrderId());
            }
        }
        if (count > 0) {
            log.info("만료 주문 {}건 CANCELED 처리 완료", count);
        }
    }
}
