package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.impl.PaymentHistoryQueryServiceImpl;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import kr.co.carrer.user.billing.type.UserPaymentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Field;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentHistoryQueryTest {

    @Mock UserPaymentRepository userPaymentRepository;
    @Mock PlanRepository planRepository;

    private PaymentHistoryQueryServiceImpl service;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new PaymentHistoryQueryServiceImpl(userPaymentRepository, planRepository);
    }

    @Test
    @DisplayName("1M 기간 — from이 현재 시각 -1개월에 근사")
    void getPaymentHistory_1M_correctFrom() {
        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of()));
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of());

        ZonedDateTime before = ZonedDateTime.now(KST).minusMonths(1).minusSeconds(5);
        service.getPaymentHistory(memberId, "1M", 0, 10);
        ZonedDateTime after = ZonedDateTime.now(KST).minusMonths(1).plusSeconds(5);

        ArgumentCaptor<ZonedDateTime> fromCaptor = ArgumentCaptor.forClass(ZonedDateTime.class);
        verify(userPaymentRepository).findPaymentHistoryByMemberId(eq(memberId), fromCaptor.capture(), any(), any());
        assertThat(fromCaptor.getValue()).isBetween(before, after);
    }

    @Test
    @DisplayName("결제 내역 반환 — PaymentHistoryItem 필드 전체 매핑")
    void getPaymentHistory_allFieldsMapped() {
        UserPayment payment = paidPayment("document-coaching");
        Plan plan = plan("document-coaching", "서류 AI 코칭");

        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(payment)));
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of(plan));

        BillingDTO.ResponsePaymentHistory result = service.getPaymentHistory(memberId, "1M", 0, 10);

        assertThat(result.content()).hasSize(1);
        BillingDTO.PaymentHistoryItem item = result.content().get(0);
        assertThat(item.productCode()).isEqualTo("document-coaching");
        assertThat(item.productName()).isEqualTo("서류 AI 코칭");
        assertThat(item.amount()).isEqualTo(29000);
        assertThat(item.currency()).isEqualTo("KRW");
        assertThat(item.paymentStatus()).isEqualTo("PAID");
        assertThat(item.paymentType()).isEqualTo("MANUAL");
        assertThat(item.attemptSequence()).isEqualTo(0);
    }

    @Test
    @DisplayName("빈 결제 내역 — 빈 리스트 반환")
    void getPaymentHistory_empty() {
        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of()));
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of());

        BillingDTO.ResponsePaymentHistory result = service.getPaymentHistory(memberId, "3M", 0, 10);

        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isEqualTo(0);
    }

    @Test
    @DisplayName("pagination 정보 — page/size/totalElements/totalPages 정확")
    void getPaymentHistory_pagination() {
        UserPayment p1 = paidPayment("document-coaching");
        UserPayment p2 = paidPayment("interview");
        PageImpl<UserPayment> page = new PageImpl<>(List.of(p1, p2), PageRequest.of(0, 10), 15);

        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(page);
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of());

        BillingDTO.ResponsePaymentHistory result = service.getPaymentHistory(memberId, "6M", 0, 10);

        assertThat(result.page()).isEqualTo(0);
        assertThat(result.size()).isEqualTo(10);
        assertThat(result.totalElements()).isEqualTo(15);
        assertThat(result.totalPages()).isEqualTo(2);
    }

    @Test
    @DisplayName("PAID/FAILED/REFUNDED 상태 — statuses 파라미터에 포함")
    void getPaymentHistory_correctStatusFilter() {
        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of()));
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of());

        service.getPaymentHistory(memberId, "12M", 0, 10);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<UserPaymentStatus>> statusCaptor = ArgumentCaptor.forClass(Set.class);
        verify(userPaymentRepository).findPaymentHistoryByMemberId(any(), any(), statusCaptor.capture(), any());

        Set<UserPaymentStatus> statuses = statusCaptor.getValue();
        assertThat(statuses).contains(UserPaymentStatus.PAID, UserPaymentStatus.FAILED, UserPaymentStatus.REFUNDED);
        assertThat(statuses).doesNotContain(UserPaymentStatus.READY, UserPaymentStatus.CONFIRMING);
    }

    @Test
    @DisplayName("AUTO_RENEWAL 결제 — paymentType AUTO_RENEWAL 반환")
    void getPaymentHistory_autoRenewalType() {
        UserPayment payment = autoRenewalPayment("interview");
        given(userPaymentRepository.findPaymentHistoryByMemberId(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(payment)));
        given(planRepository.findAllByProductCodeIn(any())).willReturn(List.of());

        BillingDTO.ResponsePaymentHistory result = service.getPaymentHistory(memberId, "1M", 0, 10);

        assertThat(result.content().get(0).paymentType()).isEqualTo("AUTO_RENEWAL");
        assertThat(result.content().get(0).attemptSequence()).isEqualTo(1);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private UserPayment paidPayment(String productCode) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        UserPayment p = UserPayment.createReady(memberId, 1L, productCode,
                "ORDER-" + UUID.randomUUID(), UUID.randomUUID().toString(),
                UUID.randomUUID().toString(), "홍길동", "test@example.com",
                29000, now.plusMinutes(30));
        setField(p, "paymentId", UUID.randomUUID());
        setField(p, "paymentStatus", UserPaymentStatus.PAID);
        setField(p, "approvedAt", now);
        setField(p, "createdAt", now);
        return p;
    }

    private UserPayment autoRenewalPayment(String productCode) {
        ZonedDateTime now = ZonedDateTime.now(KST);
        UserPayment p = UserPayment.createAutoRenewal(memberId, 1L, productCode,
                "RENEWAL-" + UUID.randomUUID(), UUID.randomUUID().toString(),
                UUID.randomUUID().toString(), "홍길동", "test@example.com",
                29000, 1);
        setField(p, "paymentId", UUID.randomUUID());
        setField(p, "paymentStatus", UserPaymentStatus.PAID);
        setField(p, "approvedAt", now);
        setField(p, "createdAt", now);
        return p;
    }

    private Plan plan(String productCode, String name) {
        Plan p = Plan.create(productCode, name, 29000, 30, "KRW", "MONTHLY", true);
        setField(p, "planId", 1L);
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
