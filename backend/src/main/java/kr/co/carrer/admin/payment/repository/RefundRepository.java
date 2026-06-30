package kr.co.carrer.admin.payment.repository;

import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.type.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByPaymentIdAndRefundStatus(UUID paymentId, RefundStatus refundStatus);

    boolean existsByPaymentIdAndRefundStatus(UUID paymentId, RefundStatus refundStatus);
}
