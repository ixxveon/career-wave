package kr.co.carrer.user.billing.demo;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.demo.dto.TossDemoDTO;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TossDemoPaymentControllerTest {

    @Mock
    private TossDemoPaymentClient demoPaymentClient;

    @InjectMocks
    private TossDemoPaymentController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "demoAmount", 1000);
        ReflectionTestUtils.setField(controller, "demoOrderName", "커리어웨이브 데모 결제");
    }

    @Test
    @DisplayName("주문 생성 — 고정 금액과 orderId(prefix demo_)를 반환한다")
    void createOrder() {
        var response = controller.createOrder().getBody();

        assertThat(response).isNotNull();
        assertThat(response.getData().amount()).isEqualTo(1000);
        assertThat(response.getData().currency()).isEqualTo("KRW");
        assertThat(response.getData().orderId()).startsWith("demo_");
    }

    @Test
    @DisplayName("금액 불일치 — 서버 고정 금액과 다르면 PAYMENT_AMOUNT_MISMATCH, Toss 호출 없음")
    void confirm_amountMismatch() {
        var request = new TossDemoDTO.RequestConfirm("pay_demo", "demo_1", 5000);

        assertThatThrownBy(() -> controller.confirm(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH));

        verify(demoPaymentClient, never()).confirm(anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("금액 일치 — Toss 승인 결과를 응답으로 매핑한다(easyPay provider 포함)")
    void confirm_success() {
        var tossResult = new TossPaymentConfirmResult(
                "pay_demo", "demo_1", "커리어웨이브 데모 결제", "DONE", 1000, "KRW", "간편결제",
                ZonedDateTime.parse("2026-07-06T10:00:00+09:00"),
                new TossPaymentConfirmResult.EasyPay("토스페이", 1000, 0));
        given(demoPaymentClient.confirm("pay_demo", "demo_1", 1000)).willReturn(tossResult);

        ResponseEntity<ApiResponse<TossDemoDTO.ResponseConfirm>> response =
                controller.confirm(new TossDemoDTO.RequestConfirm("pay_demo", "demo_1", 1000));

        var data = response.getBody().getData();
        assertThat(data.status()).isEqualTo("DONE");
        assertThat(data.totalAmount()).isEqualTo(1000);
        assertThat(data.method()).isEqualTo("간편결제");
        assertThat(data.easyPayProvider()).isEqualTo("토스페이");
    }
}
