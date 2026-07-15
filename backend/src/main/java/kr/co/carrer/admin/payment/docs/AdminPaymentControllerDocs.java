package kr.co.carrer.admin.payment.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@Tag(name = "Admin Payment", description = "관리자 결제·환불 관리 API")
public interface AdminPaymentControllerDocs {

    @Operation(summary = "결제 KPI 집계 조회")
    ResponseEntity<ApiResponse<PaymentDTO.ResponseSummary>> getSummary();

    @Operation(summary = "결제 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<PaymentDTO.ResponseList>>> getPayments(
        @Parameter(description = "주문ID·결제ID·회원명·이메일 통합 검색") @RequestParam(required = false) String keyword,
        @Parameter(description = "결제 상태 (READY / CONFIRMING / PAID / FAILED / CANCELED / REFUNDED)") @RequestParam(required = false) String status,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "결제 상세 조회")
    ResponseEntity<ApiResponse<PaymentDTO.ResponseDetail>> getPaymentDetail(
        @Parameter(description = "결제 ID (UUID)") @PathVariable UUID paymentId
    );

    @Operation(summary = "환불 요청 접수 (PENDING 생성)")
    ResponseEntity<ApiResponse<RefundDTO.ResponseCreate>> createRefundRequest(
        @Parameter(description = "결제 ID (UUID)") @PathVariable UUID paymentId,
        @Valid @RequestBody RefundDTO.RequestCreate request,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "환불 확정 처리")
    ResponseEntity<ApiResponse<RefundDTO.ResponseApprove>> approveRefund(
        @Parameter(description = "결제 ID (UUID)") @PathVariable UUID paymentId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "환불 수동 확정 처리 (Toss 취소 API 미호출 — 이미 Toss에서 수동 취소된 건 반영용)")
    ResponseEntity<ApiResponse<RefundDTO.ResponseApprove>> manualConfirmRefund(
        @Parameter(description = "결제 ID (UUID)") @PathVariable UUID paymentId,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "환불 불가 처리")
    ResponseEntity<ApiResponse<RefundDTO.ResponseReject>> rejectRefund(
        @Parameter(description = "결제 ID (UUID)") @PathVariable UUID paymentId,
        @Valid @RequestBody RefundDTO.RequestReject request,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );
}
