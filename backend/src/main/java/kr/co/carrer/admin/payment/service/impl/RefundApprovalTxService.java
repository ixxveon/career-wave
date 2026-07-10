package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.dto.RefundDTO;
import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.repository.PaymentRepository;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Toss 취소 호출(최대 10초 블로킹)을 트랜잭션 밖에서 수행하기 위해, 호출 전/후의 DB
// 읽기·쓰기를 별도 빈의 트랜잭션 메서드로 분리한다. AdminPaymentServiceImpl에서 같은 클래스
// 메서드로 분리했다면 self-invocation 때문에 @Transactional이 적용되지 않아 별도 빈으로 뺐다.
@Service
@RequiredArgsConstructor
public class RefundApprovalTxService {

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;

    public record CancelRequest(String paymentKey, String reason, int amount) {}

    @Transactional(readOnly = true)
    public CancelRequest prepareCancel(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_REFUNDABLE);
        }

        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

        if (payment.getPaymentKey() == null || payment.getPaymentKey().isBlank()) {
            throw new CustomException(AdminPaymentErrorCode.PAYMENT_INVALID_PARAM);
        }

        return new CancelRequest(payment.getPaymentKey(), refund.getReason(), refund.getAmount());
    }

    @Transactional
    public RefundDTO.ResponseApprove finalizeApproval(UUID paymentId, Long adminId) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.PAYMENT_NOT_FOUND));
        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));

        refund.approve(adminId);
        payment.refund();
        refundRepository.save(refund);
        paymentRepository.save(payment);

        return new RefundDTO.ResponseApprove(
            paymentId.toString(),
            payment.getPaymentStatus(),
            refund.getRefundStatus()
        );
    }
}
