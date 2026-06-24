package kr.co.carrer.user.billing.controller;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.CancelSubscriptionService;
import kr.co.carrer.user.billing.service.PaymentHistoryQueryService;
import kr.co.carrer.user.billing.service.SubscriptionQueryService;
import kr.co.carrer.user.billing.service.UserCheckoutOrderService;
import kr.co.carrer.user.billing.service.UserOrderQueryService;
import kr.co.carrer.user.billing.service.UserPaymentConfirmService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

// BillingControllerContractTest: SubscriptionController(cancel) + UserBillingPaymentController(history) 계약 검증
class BillingControllerContractTest {

    private final SubscriptionQueryService subscriptionQueryService = mock(SubscriptionQueryService.class);
    private final CancelSubscriptionService cancelSubscriptionService = mock(CancelSubscriptionService.class);
    private final PaymentHistoryQueryService paymentHistoryQueryService = mock(PaymentHistoryQueryService.class);
    private final UserCheckoutOrderService checkoutService = mock(UserCheckoutOrderService.class);
    private final UserPaymentConfirmService confirmService = mock(UserPaymentConfirmService.class);
    private final UserOrderQueryService orderQueryService = mock(UserOrderQueryService.class);

    private final SubscriptionController subscriptionController =
            new SubscriptionController(subscriptionQueryService, cancelSubscriptionService);
    private final UserBillingPaymentController paymentController =
            new UserBillingPaymentController(checkoutService, confirmService, orderQueryService, paymentHistoryQueryService);

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();
    private final AuthPrincipal principal =
            new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);

    @Test
    @DisplayName("POST /subscriptions/{subscriptionId}/cancel — 200, ResponseCancelSubscription 필드 전체")
    void cancelSubscription_200_allFields() {
        ZonedDateTime periodEnd = ZonedDateTime.now(KST).plusDays(15);
        ZonedDateTime cancelScheduledAt = ZonedDateTime.now(KST);
        BillingDTO.ResponseCancelSubscription cancelResponse = new BillingDTO.ResponseCancelSubscription(
                subscriptionId, "interview", "CANCEL_SCHEDULED", periodEnd, cancelScheduledAt);
        given(cancelSubscriptionService.cancel(any(), any())).willReturn(cancelResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponseCancelSubscription>> response =
                subscriptionController.cancelSubscription(principal, subscriptionId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponseCancelSubscription data = response.getBody().getData();
        assertThat(data.subscriptionId()).isEqualTo(subscriptionId);
        assertThat(data.productCode()).isEqualTo("interview");
        assertThat(data.status()).isEqualTo("CANCEL_SCHEDULED");
        assertThat(data.currentPeriodEnd()).isEqualTo(periodEnd);
        assertThat(data.cancelScheduledAt()).isEqualTo(cancelScheduledAt);
        assertThat(response.getBody().getMessage()).isEqualTo("구독 해지가 예약되었습니다.");
    }

    @Test
    @DisplayName("GET /billing/payments/history — 200, ResponsePaymentHistory 필드 전체")
    void getPaymentHistory_200_allFields() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        BillingDTO.PaymentHistoryItem item = new BillingDTO.PaymentHistoryItem(
                UUID.randomUUID(), "ORDER-ABC", "document-coaching", "서류 AI 코칭",
                29000, "KRW", "PAID", "MANUAL", 0, null, now, now);
        BillingDTO.ResponsePaymentHistory historyResponse =
                new BillingDTO.ResponsePaymentHistory(List.of(item), 0, 10, 1L, 1);
        given(paymentHistoryQueryService.getPaymentHistory(any(), anyString(), anyInt(), anyInt()))
                .willReturn(historyResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentHistory>> response =
                paymentController.getPaymentHistory(principal, "1M", 0, 10);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponsePaymentHistory data = response.getBody().getData();
        assertThat(data.payments()).hasSize(1);
        assertThat(data.page()).isEqualTo(0);
        assertThat(data.size()).isEqualTo(10);
        assertThat(data.totalElements()).isEqualTo(1L);
        assertThat(data.totalPages()).isEqualTo(1);
        assertThat(response.getBody().getMessage()).isEqualTo("결제 내역을 조회했습니다.");
    }

    @Test
    @DisplayName("GET /billing/payments/history — PaymentHistoryItem 필드 전체")
    void getPaymentHistory_itemAllFields() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        UUID paymentId = UUID.randomUUID();
        BillingDTO.PaymentHistoryItem item = new BillingDTO.PaymentHistoryItem(
                paymentId, "RENEWAL-001", "interview", "AI 모의면접",
                29000, "KRW", "PAID", "AUTO_RENEWAL", 1, null, now, now);
        given(paymentHistoryQueryService.getPaymentHistory(any(), anyString(), anyInt(), anyInt()))
                .willReturn(new BillingDTO.ResponsePaymentHistory(List.of(item), 0, 10, 1L, 1));

        ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentHistory>> response =
                paymentController.getPaymentHistory(principal, "3M", 0, 10);

        BillingDTO.PaymentHistoryItem result = response.getBody().getData().payments().get(0);
        assertThat(result.paymentId()).isEqualTo(paymentId);
        assertThat(result.orderId()).isEqualTo("RENEWAL-001");
        assertThat(result.productCode()).isEqualTo("interview");
        assertThat(result.productName()).isEqualTo("AI 모의면접");
        assertThat(result.amount()).isEqualTo(29000);
        assertThat(result.currency()).isEqualTo("KRW");
        assertThat(result.paymentStatus()).isEqualTo("PAID");
        assertThat(result.paymentType()).isEqualTo("AUTO_RENEWAL");
        assertThat(result.attemptSequence()).isEqualTo(1);
        assertThat(result.failureReason()).isNull();
        assertThat(result.paidAt()).isEqualTo(now);
        assertThat(result.createdAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("GET /billing/payments/history — 빈 목록 200 반환")
    void getPaymentHistory_empty_200() {
        given(paymentHistoryQueryService.getPaymentHistory(any(), anyString(), anyInt(), anyInt()))
                .willReturn(new BillingDTO.ResponsePaymentHistory(List.of(), 0, 10, 0L, 0));

        ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentHistory>> response =
                paymentController.getPaymentHistory(principal, "12M", 0, 10);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getData().payments()).isEmpty();
        assertThat(response.getBody().getData().totalElements()).isEqualTo(0L);
    }
}
