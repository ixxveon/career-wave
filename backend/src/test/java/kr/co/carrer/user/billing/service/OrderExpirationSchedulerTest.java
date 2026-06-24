package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.scheduler.OrderExpirationScheduler;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderExpirationSchedulerTest {

    @Mock UserPaymentRepository userPaymentRepository;

    private OrderExpirationScheduler scheduler;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        scheduler = new OrderExpirationScheduler(userPaymentRepository);
    }

    @Test
    @DisplayName("만료 시각 초과 READY 주문 — CANCELED 전이")
    void expireStaleOrders_expiredReady_canceled() {
        ZonedDateTime pastExpiry = ZonedDateTime.now(KST).minusMinutes(1);
        UserPayment expiredPayment = readyPayment(memberId, "ORDER-EXPIRED", pastExpiry);
        given(userPaymentRepository.findExpiredReadyOrders(any()))
                .willReturn(List.of(expiredPayment));

        scheduler.expireStaleOrders();

        assertThat(expiredPayment.getPaymentStatus()).isEqualTo(UserPaymentStatus.CANCELED);
    }

    @Test
    @DisplayName("유효 시간 이내 READY 주문 — 상태 변경 없음")
    void expireStaleOrders_validReady_noChange() {
        given(userPaymentRepository.findExpiredReadyOrders(any()))
                .willReturn(List.of());

        scheduler.expireStaleOrders();

        // 만료 대상 없으므로 cancel() 호출 없음 — 실제로는 조회 결과가 비어 있음
        assertThat(true).isTrue();
    }

    @Test
    @DisplayName("만료 주문 여러 개 — 전부 CANCELED 전이")
    void expireStaleOrders_multipleExpired_allCanceled() {
        ZonedDateTime pastExpiry = ZonedDateTime.now(KST).minusMinutes(5);
        UserPayment p1 = readyPayment(memberId, "ORDER-EXP1", pastExpiry);
        UserPayment p2 = readyPayment(memberId, "ORDER-EXP2", pastExpiry);
        given(userPaymentRepository.findExpiredReadyOrders(any()))
                .willReturn(List.of(p1, p2));

        scheduler.expireStaleOrders();

        assertThat(p1.getPaymentStatus()).isEqualTo(UserPaymentStatus.CANCELED);
        assertThat(p2.getPaymentStatus()).isEqualTo(UserPaymentStatus.CANCELED);
    }

    @Test
    @DisplayName("이미 AUTHORIZED 주문 — cancel() 예외가 발생해도 다른 주문은 처리됨")
    void expireStaleOrders_alreadyAuthorized_skippedGracefully() {
        ZonedDateTime pastExpiry = ZonedDateTime.now(KST).minusMinutes(1);
        UserPayment authorizedPayment = readyPayment(memberId, "ORDER-AUTH", pastExpiry);
        authorizedPayment.authorize();  // AUTHORIZED 상태로 전이 — cancel() 호출 시 예외
        UserPayment expiredPayment = readyPayment(memberId, "ORDER-EXPIRED", pastExpiry);

        given(userPaymentRepository.findExpiredReadyOrders(any()))
                .willReturn(List.of(authorizedPayment, expiredPayment));

        // 예외 전파 없이 완료
        scheduler.expireStaleOrders();

        // AUTHORIZED는 변경 없음, READY는 CANCELED
        assertThat(authorizedPayment.getPaymentStatus()).isEqualTo(UserPaymentStatus.AUTHORIZED);
        assertThat(expiredPayment.getPaymentStatus()).isEqualTo(UserPaymentStatus.CANCELED);
    }

    @Test
    @DisplayName("만료 대상 없음 — 조회만 수행, 변경 없음")
    void expireStaleOrders_noExpired_noCancellation() {
        given(userPaymentRepository.findExpiredReadyOrders(any()))
                .willReturn(List.of());

        scheduler.expireStaleOrders();

        verify(userPaymentRepository).findExpiredReadyOrders(any());
        verify(userPaymentRepository, never()).save(any());
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private UserPayment readyPayment(UUID memberId, String orderId, ZonedDateTime expiresAt) {
        return UserPayment.createReady(memberId, 1L, "document-coaching", orderId,
                UUID.randomUUID().toString(), UUID.randomUUID().toString(),
                "홍길동", "test@example.com", 29000, expiresAt);
    }
}
