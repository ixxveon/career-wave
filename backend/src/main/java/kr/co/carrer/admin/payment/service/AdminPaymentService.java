package kr.co.carrer.admin.payment.service;

import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.global.response.PaginationResponse;

import java.util.UUID;

public interface AdminPaymentService {

    PaymentDTO.ResponseSummary getSummary();

    PaginationResponse<PaymentDTO.ResponseList> getPayments(String keyword, PaymentStatus status, int page, int size);

    PaymentDTO.ResponseDetail getPaymentDetail(UUID paymentId);

    RefundDTO.ResponseCreate createRefundRequest(UUID paymentId, String reason, Long adminId);

    RefundDTO.ResponseApprove approveRefund(UUID paymentId, Long adminId, String adminRole);

    // Toss 실제 취소 API 호출 없이 DB 상태만 확정 처리 — Toss 쪽에서 이미 수동으로
    // 취소 처리된 건을 관리자가 시스템에 반영할 때 사용 (#1193 임시 대응).
    RefundDTO.ResponseApprove manualConfirmRefund(UUID paymentId, Long adminId, String adminRole, String ipAddress);

    RefundDTO.ResponseReject rejectRefund(UUID paymentId, String rejectReason, Long adminId, String adminRole);
}
