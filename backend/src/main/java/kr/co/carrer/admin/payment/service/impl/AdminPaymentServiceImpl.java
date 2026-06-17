package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.PaymentDTO;
import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.repository.PaymentQueryRepository;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.service.AdminPaymentService;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminPaymentServiceImpl implements AdminPaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentQueryRepository paymentQueryRepository;
    private final RefundRepository refundRepository;

    @Override
    @Transactional(readOnly = true)
    public PaymentDTO.ResponseSummary getSummary() {
        long totalRevenue = paymentRepository.sumPaidAmount();
        long paidCount = paymentRepository.countByPaymentStatus(PaymentStatus.PAID);
        long refundPendingCount = paymentRepository.countRefundPending();
        long failedCount = paymentRepository.countByPaymentStatus(PaymentStatus.FAILED);
        return new PaymentDTO.ResponseSummary(totalRevenue, paidCount, refundPendingCount, failedCount);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<PaymentDTO.ResponseList> getPayments(String keyword, PaymentStatus status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int offset = (safePage - 1) * safeSize;

        List<PaymentDTO.ResponseList> items = paymentQueryRepository.findPayments(keyword, status, offset, safeSize);
        long total = paymentQueryRepository.countPayments(keyword, status);
        return PaginationResponse.of(items, safePage, safeSize, total);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDTO.ResponseDetail getPaymentDetail(UUID paymentId) {
        PaymentDTO.ResponseDetail base = paymentQueryRepository.findPaymentDetail(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        PaymentDTO.ResponseDetail.AiUsage aiUsage = paymentQueryRepository.findAiUsage(
            UUID.fromString(base.paymentId())
        );

        return new PaymentDTO.ResponseDetail(
            base.paymentId(), base.orderId(), base.memberName(), base.memberEmail(),
            base.planName(), base.approvedAt(), base.amount(), base.paymentStatus(),
            base.paymentMethod(), base.refundStatus(), aiUsage
        );
    }

    @Override
    @Transactional
    public RefundDTO.ResponseApprove approveRefund(UUID paymentId, Long adminId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE);
        }

        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

        try {
            // Toss 환불 API — v1 stub 처리
            refund.approve(adminId);
            payment.cancel();
            refundRepository.save(refund);
            paymentRepository.save(payment);
        } catch (Exception e) {
            saveRefundFailed(refund, adminId);
            throw new CustomException(AdminPaymentErrorCode.TOSS_REFUND_FAILED);
        }

        return new RefundDTO.ResponseApprove(
            paymentId.toString(),
            payment.getPaymentStatus(),
            refund.getRefundStatus()
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveRefundFailed(Refund refund, Long adminId) {
        refund.fail(adminId);
        refundRepository.save(refund);
    }

    @Override
    @Transactional
    public RefundDTO.ResponseReject rejectRefund(UUID paymentId, String rejectReason, Long adminId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        if (rejectReason == null || rejectReason.isBlank()) {
            throw new CustomException(AdminPaymentErrorCode.REJECT_REASON_REQUIRED);
        }

        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

        refund.reject(adminId, rejectReason);
        refundRepository.save(refund);

        return new RefundDTO.ResponseReject(
            paymentId.toString(),
            payment.getPaymentStatus(),
            refund.getRefundStatus()
        );
    }
}
