package kr.co.carrer.admin.payment.repository;

import kr.co.carrer.admin.payment.entity.Refund;
import kr.co.carrer.admin.payment.type.RefundStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByPaymentIdAndRefundStatus(UUID paymentId, RefundStatus refundStatus);

    boolean existsByPaymentIdAndRefundStatus(UUID paymentId, RefundStatus refundStatus);

    // 같은 환불 건을 두 관리자가 동시에 확정 처리하는 것을 막기 위한 행 잠금 조회
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Refund r WHERE r.paymentId = :paymentId AND r.refundStatus = :refundStatus")
    Optional<Refund> findByPaymentIdAndRefundStatusForUpdate(
            @Param("paymentId") UUID paymentId,
            @Param("refundStatus") RefundStatus refundStatus);
}
