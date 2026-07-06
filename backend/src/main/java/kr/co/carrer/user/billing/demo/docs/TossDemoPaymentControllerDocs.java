package kr.co.carrer.user.billing.demo.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.user.billing.demo.dto.TossDemoDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Billing - Toss Demo", description = "데모용 일반결제(토스페이 QR) — 구독 발급 없음")
public interface TossDemoPaymentControllerDocs {

    @Operation(summary = "데모 주문 생성", description = "고정 금액의 orderId 를 발급한다. 프론트가 Toss requestPayment() 에 사용한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "주문 생성 성공")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<TossDemoDTO.ResponseCreateOrder>> createOrder();

    @Operation(summary = "데모 결제 승인", description = "Toss 성공 리다이렉트로 받은 paymentKey/orderId/amount 로 결제를 승인한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "결제 승인 성공"),
            @ApiResponse(responseCode = "400", description = "금액 불일치"),
            @ApiResponse(responseCode = "422", description = "Toss 승인 실패")
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<TossDemoDTO.ResponseConfirm>> confirm(
            @RequestBody TossDemoDTO.RequestConfirm request
    );
}
