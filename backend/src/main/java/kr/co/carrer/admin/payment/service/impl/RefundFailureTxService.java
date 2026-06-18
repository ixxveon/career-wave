package kr.co.carrer.admin.payment.service.impl;

import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefundFailureTxService {

    private final RefundRepository refundRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveRefundFailed(Refund refund, Long adminId) {
        refund.fail(adminId);
        refundRepository.save(refund);
    }
}
