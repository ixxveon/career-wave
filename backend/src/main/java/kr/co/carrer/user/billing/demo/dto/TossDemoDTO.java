package kr.co.carrer.user.billing.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.time.ZonedDateTime;

/**
 * 데모 전용 일반결제(단건) DTO.
 *
 * <p>기존 자동결제(빌링) 흐름({@code BillingDTO})과 완전히 분리된 계약이다.
 * Toss 테스트 키로 실제 결제창(토스페이 QR)을 띄워 시연하는 용도이며, 구독/entitlement 발급과 무관하다.
 */
public class TossDemoDTO {

    /** 주문 생성 응답 — 프론트가 이 orderId/amount 로 Toss requestPayment() 를 호출한다. */
    public record ResponseCreateOrder(
            @Schema(example = "demo_3f2a...") String orderId,
            @Schema(example = "1000") int amount,
            @Schema(example = "KRW") String currency,
            @Schema(example = "커리어웨이브 데모 결제") String orderName
    ) {}

    /** 승인 요청 — Toss 성공 리다이렉트 쿼리(paymentKey/orderId/amount)를 그대로 전달받는다. */
    public record RequestConfirm(
            @NotBlank String paymentKey,
            @NotBlank String orderId,
            @Positive int amount
    ) {}

    /** 승인 응답 — Toss 결제 결과를 프론트 성공 화면에 그대로 보여준다. */
    public record ResponseConfirm(
            String paymentKey,
            String orderId,
            String orderName,
            @Schema(allowableValues = {"DONE"}) String status,
            int totalAmount,
            String currency,
            @Schema(example = "간편결제") String method,
            @Schema(example = "토스페이") String easyPayProvider,
            ZonedDateTime approvedAt
    ) {}
}
