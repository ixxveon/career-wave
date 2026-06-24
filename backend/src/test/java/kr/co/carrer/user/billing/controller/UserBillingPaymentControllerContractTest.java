package kr.co.carrer.user.billing.controller;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.UserCheckoutOrderService;
import kr.co.carrer.user.billing.service.UserOrderQueryService;
import kr.co.carrer.user.billing.service.UserPaymentConfirmService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class UserBillingPaymentControllerContractTest {

    private final UserCheckoutOrderService checkoutService = mock(UserCheckoutOrderService.class);
    private final UserPaymentConfirmService confirmService = mock(UserPaymentConfirmService.class);
    private final UserOrderQueryService queryService = mock(UserOrderQueryService.class);
    private final kr.co.carrer.user.billing.service.PaymentHistoryQueryService historyService =
            mock(kr.co.carrer.user.billing.service.PaymentHistoryQueryService.class);
    private final UserBillingPaymentController controller =
            new UserBillingPaymentController(checkoutService, confirmService, queryService, historyService);

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private final UUID memberId = UUID.randomUUID();
    private final AuthPrincipal principal =
            new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);

    @Test
    @DisplayName("POST /billing/checkout/orders — 200, CreateOrderResponse 필드 전체")
    void createOrder_200_allFields() {
        ZonedDateTime expiresAt = ZonedDateTime.now(KST).plusMinutes(30);
        BillingDTO.ResponseCreateOrder orderResponse = new BillingDTO.ResponseCreateOrder(
                "ORDER-ABC", "idempotency-key", "document-coaching", "서류 AI 코칭",
                29000, "KRW", "MONTHLY", "홍길동", "test@example.com", "customer-key", expiresAt);
        given(checkoutService.createOrder(any(), any())).willReturn(orderResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponseCreateOrder>> response =
                controller.createOrder(principal, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponseCreateOrder data = response.getBody().getData();
        assertThat(data.orderId()).isEqualTo("ORDER-ABC");
        assertThat(data.productCode()).isEqualTo("document-coaching");
        assertThat(data.amount()).isEqualTo(29000);
        assertThat(data.currency()).isEqualTo("KRW");
        assertThat(data.billingCycle()).isEqualTo("MONTHLY");
        assertThat(data.customerKey()).isEqualTo("customer-key");
        assertThat(data.expiresAt()).isEqualTo(expiresAt);
    }

    @Test
    @DisplayName("POST /billing/payments/confirm — 200, ConfirmPaymentResponse 필드 전체")
    void confirmPayment_200_allFields() {
        ZonedDateTime paidAt = ZonedDateTime.now(KST);
        ZonedDateTime nextBillingAt = paidAt.plusDays(30);
        UUID paymentId = UUID.randomUUID();
        BillingDTO.ResponseConfirmPayment confirmResponse = new BillingDTO.ResponseConfirmPayment(
                paymentId, "ORDER-ABC", "document-coaching", "서류 AI 코칭",
                29000, "KRW", "PAID", "ACTIVE", paidAt, nextBillingAt);
        given(confirmService.confirm(any(), any())).willReturn(confirmResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponseConfirmPayment>> response =
                controller.confirmPayment(principal,
                        new BillingDTO.RequestConfirmPayment("authKey", "ck", "ORDER-ABC"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponseConfirmPayment data = response.getBody().getData();
        assertThat(data.paymentId()).isEqualTo(paymentId);
        assertThat(data.orderId()).isEqualTo("ORDER-ABC");
        assertThat(data.productCode()).isEqualTo("document-coaching");
        assertThat(data.amount()).isEqualTo(29000);
        assertThat(data.paymentStatus()).isEqualTo("PAID");
        assertThat(data.subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(data.paidAt()).isEqualTo(paidAt);
        assertThat(data.nextBillingAt()).isEqualTo(nextBillingAt);
    }

    @Test
    @DisplayName("ConfirmPaymentResponse — billingKey 필드 없음")
    void confirmPayment_responseNoBillingKey() {
        var fieldNames = java.util.Arrays.stream(BillingDTO.ResponseConfirmPayment.class.getRecordComponents())
                .map(rc -> rc.getName().toLowerCase())
                .toList();
        assertThat(fieldNames).noneMatch(name -> name.equals("billingkey"));
        assertThat(fieldNames).noneMatch(name -> name.equals("authkey"));
    }

    @Test
    @DisplayName("POST /billing/payments/fail — 200, RecordPaymentFailResponse 필드")
    void recordPaymentFail_200() {
        BillingDTO.ResponseRecordPaymentFail failResponse =
                new BillingDTO.ResponseRecordPaymentFail("ORDER-ABC", "FAILED", true);
        given(confirmService.recordFail(any(), any())).willReturn(failResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponseRecordPaymentFail>> response =
                controller.recordPaymentFail(principal, new BillingDTO.RequestRecordPaymentFail(
                        "ORDER-ABC", "document-coaching", "CARD_DECLINED", "카드 거절"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponseRecordPaymentFail data = response.getBody().getData();
        assertThat(data.orderId()).isEqualTo("ORDER-ABC");
        assertThat(data.paymentStatus()).isEqualTo("FAILED");
        assertThat(data.retryable()).isTrue();
    }

    @Test
    @DisplayName("GET /billing/payments/orders/{orderId} — 200, PaymentStatusResponse 필드 전체")
    void getOrderStatus_200_allFields() {
        ZonedDateTime paidAt = ZonedDateTime.now(KST);
        BillingDTO.ResponsePaymentStatus statusResponse = new BillingDTO.ResponsePaymentStatus(
                "ORDER-ABC", "PAID", "document-coaching", "서류 AI 코칭",
                29000, paidAt, null);
        given(queryService.getOrderStatus(any(), any())).willReturn(statusResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentStatus>> response =
                controller.getOrderStatus(principal, "ORDER-ABC");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        BillingDTO.ResponsePaymentStatus data = response.getBody().getData();
        assertThat(data.orderId()).isEqualTo("ORDER-ABC");
        assertThat(data.paymentStatus()).isEqualTo("PAID");
        assertThat(data.productCode()).isEqualTo("document-coaching");
        assertThat(data.productName()).isEqualTo("서류 AI 코칭");
        assertThat(data.amount()).isEqualTo(29000);
        assertThat(data.paidAt()).isEqualTo(paidAt);
        assertThat(data.failure()).isNull();
    }

    @Test
    @DisplayName("GET /billing/payments/orders/{orderId} — FAILED 상태 failure 필드 포함")
    void getOrderStatus_failed_withFailureDetail() {
        BillingDTO.PaymentFailureDetail failure = new BillingDTO.PaymentFailureDetail(
                "CARD_DECLINED", "카드 승인이 거절되었습니다.", true);
        BillingDTO.ResponsePaymentStatus statusResponse = new BillingDTO.ResponsePaymentStatus(
                "ORDER-FAIL", "FAILED", "interview", "AI 모의면접",
                29000, null, failure);
        given(queryService.getOrderStatus(any(), any())).willReturn(statusResponse);

        ResponseEntity<ApiResponse<BillingDTO.ResponsePaymentStatus>> response =
                controller.getOrderStatus(principal, "ORDER-FAIL");

        BillingDTO.ResponsePaymentStatus data = response.getBody().getData();
        assertThat(data.failure()).isNotNull();
        assertThat(data.failure().reasonCode()).isEqualTo("CARD_DECLINED");
        assertThat(data.failure().retryable()).isTrue();
        assertThat(data.paidAt()).isNull();
    }

    @Test
    @DisplayName("응답 wrapper — 메시지 포함")
    void allEndpoints_responseMessage() {
        ZonedDateTime expiresAt = ZonedDateTime.now(KST).plusMinutes(30);
        given(checkoutService.createOrder(any(), any()))
                .willReturn(new BillingDTO.ResponseCreateOrder(
                        "O", "ik", "document-coaching", "코칭", 29000, "KRW", "MONTHLY",
                        "홍길동", "e@e.com", "ck", expiresAt));

        ResponseEntity<ApiResponse<BillingDTO.ResponseCreateOrder>> response =
                controller.createOrder(principal, new BillingDTO.RequestCreateOrder("document-coaching", "http://localhost/success", "http://localhost/fail"));

        assertThat(response.getBody().getMessage()).isEqualTo("결제 주문이 생성되었습니다.");
    }
}
