package kr.co.carrer.admin.payment.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.payment.docs.AdminPaymentControllerDocs;
import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.service.AdminPaymentService;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPaymentController implements AdminPaymentControllerDocs {

    private final AdminPaymentService adminPaymentService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PaymentDTO.ResponseSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(adminPaymentService.getSummary()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<PaymentDTO.ResponseList>>> getPayments(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        PaymentStatus paymentStatus = parseEnum(PaymentStatus.class, status);
        return ResponseEntity.ok(ApiResponse.ok(
            adminPaymentService.getPayments(keyword, paymentStatus, page, size)
        ));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<PaymentDTO.ResponseDetail>> getPaymentDetail(
        @PathVariable UUID paymentId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminPaymentService.getPaymentDetail(paymentId)));
    }

    @PostMapping("/{paymentId}/refund-request")
    public ResponseEntity<ApiResponse<RefundDTO.ResponseCreate>> createRefundRequest(
        @PathVariable UUID paymentId,
        @Valid @RequestBody RefundDTO.RequestCreate request,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long adminId = resolveAdminId(principal);
        return ResponseEntity.ok(ApiResponse.ok(
            adminPaymentService.createRefundRequest(paymentId, request.reason(), adminId)
        ));
    }

    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<ApiResponse<RefundDTO.ResponseApprove>> approveRefund(
        @PathVariable UUID paymentId,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long adminId = resolveAdminId(principal);
        return ResponseEntity.ok(ApiResponse.ok(adminPaymentService.approveRefund(paymentId, adminId, principal.getAdminRole())));
    }

    @PostMapping("/{paymentId}/refund-manual-confirm")
    public ResponseEntity<ApiResponse<RefundDTO.ResponseApprove>> manualConfirmRefund(
        @PathVariable UUID paymentId,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long adminId = resolveAdminId(principal);
        return ResponseEntity.ok(ApiResponse.ok(
            adminPaymentService.manualConfirmRefund(paymentId, adminId, principal.getAdminRole())
        ));
    }

    @PostMapping("/{paymentId}/refund-reject")
    public ResponseEntity<ApiResponse<RefundDTO.ResponseReject>> rejectRefund(
        @PathVariable UUID paymentId,
        @Valid @RequestBody RefundDTO.RequestReject request,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long adminId = resolveAdminId(principal);
        return ResponseEntity.ok(ApiResponse.ok(
            adminPaymentService.rejectRefund(paymentId, request.rejectReason(), adminId, principal.getAdminRole())
        ));
    }

    private Long resolveAdminId(AuthPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
        try {
            return Long.parseLong(principal.getId());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
