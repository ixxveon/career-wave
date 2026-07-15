package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.client.PaymentCancelClient;
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
import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminPaymentServiceImpl implements AdminPaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentQueryRepository paymentQueryRepository;
    private final RefundRepository refundRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentCancelClient paymentCancelClient;
    // Toss 취소 API 실패 시 호출 (REQUIRES_NEW로 실패 이력 별도 커밋)
    private final RefundFailureTxService refundFailureTxService;
    // Toss 취소 호출 전/후 DB 읽기·쓰기를 별도 트랜잭션으로 분리 (아래 approveRefund 참고)
    private final RefundApprovalTxService refundApprovalTxService;

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
        int offset = (int) Math.min((long) (safePage - 1) * safeSize, Integer.MAX_VALUE);

        List<PaymentDTO.ResponseList> items = paymentQueryRepository.findPayments(keyword, status, offset, safeSize);
        long total = paymentQueryRepository.countPayments(keyword, status);
        return PaginationResponse.of(items, safePage, safeSize, total);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDTO.ResponseDetail getPaymentDetail(UUID paymentId) {
        PaymentDTO.ResponseDetail base = paymentQueryRepository.findPaymentDetail(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        PaymentDTO.ResponseDetail.AiUsage aiUsage = paymentQueryRepository.findAiUsage(paymentId);

        return new PaymentDTO.ResponseDetail(
            base.paymentId(), base.orderId(), base.memberName(), base.memberEmail(),
            base.planName(), base.approvedAt(), base.amount(), base.paymentStatus(),
            base.paymentMethod(), base.refundStatus(), aiUsage
        );
    }

    @Override
    @Transactional
    public RefundDTO.ResponseCreate createRefundRequest(UUID paymentId, String reason, Long adminId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE);
        }

        if (refundRepository.existsByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)) {
            throw new CustomException(AdminPaymentErrorCode.REFUND_ALREADY_PENDING);
        }

        Refund refund = Refund.create(paymentId, payment.getAmount(), reason, adminId);
        try {
            refundRepository.save(refund);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(AdminPaymentErrorCode.REFUND_ALREADY_PENDING);
        }

        if (payment.getSubscriptionId() != null) {
            subscriptionRepository.findBySubscriptionIdForUpdate(payment.getSubscriptionId())
                    .ifPresent(Subscription::markRefundPending);
        }

        return new RefundDTO.ResponseCreate(paymentId.toString(), refund.getRefundStatus());
    }

    @Override
    public RefundDTO.ResponseApprove approveRefund(UUID paymentId, Long adminId, String adminRole) {
        validateMasterRole(adminRole);

        // 검증/조회는 짧은 읽기 전용 트랜잭션으로 끝내고, Toss HTTP 호출(최대 10초 블로킹)은
        // 트랜잭션 밖에서 수행한다 — DB 커넥션이 외부 API 응답을 기다리며 점유되는 것을 방지.
        RefundApprovalTxService.CancelRequest req = refundApprovalTxService.prepareCancel(paymentId);

        try {
            paymentCancelClient.cancel(req.paymentKey(), req.reason(), req.amount());
        } catch (CustomException e) {
            if (e.getErrorCode() == AdminPaymentErrorCode.TOSS_REFUND_AMBIGUOUS) {
                // Toss 쪽에서 실제로는 취소가 처리됐을 수도 있는 불확실한 상태 — 확정 실패로
                // 기록하지 않는다. 환불은 PENDING으로 유지되어 관리자가 Toss 대시보드 확인 후
                // 재시도하거나 수동으로 처리할 수 있다.
                throw e;
            }
            // 4xx 등 Toss가 명시적으로 거부한 확정 실패만 별도 REQUIRES_NEW 트랜잭션으로 기록한다.
            refundFailureTxService.saveRefundFailed(paymentId, adminId);
            throw e;
        }

        return refundApprovalTxService.finalizeApproval(paymentId, adminId);
    }

    @Override
    @Transactional
    public RefundDTO.ResponseReject rejectRefund(UUID paymentId, String rejectReason, Long adminId, String adminRole) {
        validateMasterRole(adminRole);
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

        refund.reject(adminId, rejectReason);
        refundRepository.save(refund);

        if (payment.getSubscriptionId() != null) {
            subscriptionRepository.findBySubscriptionIdForUpdate(payment.getSubscriptionId())
                    .ifPresent(Subscription::revertRefundPending);
        }

        return new RefundDTO.ResponseReject(
            paymentId.toString(),
            payment.getPaymentStatus(),
            refund.getRefundStatus()
        );
    }

    private void validateMasterRole(String adminRole) {
        if (!"MASTER".equals(adminRole)) {
            throw new CustomException(AdminPaymentErrorCode.REFUND_APPROVAL_FORBIDDEN);
        }
    }
}
