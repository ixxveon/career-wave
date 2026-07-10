package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.exception.AdminPaymentErrorCode;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import kr.co.carrer.admin.payment.type.RefundStatus;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefundFailureTxService {

    private final RefundRepository refundRepository;

    // paymentId로 재조회한다 — 호출부(AdminPaymentServiceImpl)가 Toss 취소 호출을
    // 트랜잭션 밖에서 수행하기 때문에 트랜잭션에 붙어있는 Refund 엔티티를 들고 있지 않다.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveRefundFailed(UUID paymentId, Long adminId) {
        Refund refund = refundRepository.findByPaymentIdAndRefundStatus(paymentId, RefundStatus.PENDING)
            .orElseThrow(() -> new CustomException(AdminPaymentErrorCode.REFUND_NOT_PENDING));
        refund.fail(adminId);
        refundRepository.save(refund);
    }
}
