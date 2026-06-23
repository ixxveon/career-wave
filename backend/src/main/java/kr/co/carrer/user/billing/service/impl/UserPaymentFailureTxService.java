package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

// 주 트랜잭션이 롤백되어도 실패 이력은 DB에 영구 저장 — constitution §8.4
@Slf4j
@Service
@RequiredArgsConstructor
public class UserPaymentFailureTxService {

    private static final Set<UserPaymentStatus> FAILURABLE = Set.of(
            UserPaymentStatus.READY,
            UserPaymentStatus.AUTHORIZED,
            UserPaymentStatus.CONFIRMING,
            UserPaymentStatus.RECONCILING
    );

    private final UserPaymentRepository userPaymentRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failPayment(UUID paymentId, PaymentFailureReason reason) {
        userPaymentRepository.findById(paymentId).ifPresent(payment -> {
            if (FAILURABLE.contains(payment.getPaymentStatus())) {
                payment.fail(reason);
            }
        });
    }
}
