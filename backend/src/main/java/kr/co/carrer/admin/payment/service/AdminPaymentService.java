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

    RefundDTO.ResponseApprove approveRefund(UUID paymentId, Long adminId);

    RefundDTO.ResponseReject rejectRefund(UUID paymentId, String rejectReason, Long adminId);
}
