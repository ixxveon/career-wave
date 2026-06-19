package kr.co.carrer.admin.payment.repository;

import kr.co.carrer.admin.payment.entity.Payment;
import kr.co.carrer.admin.payment.type.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    long countByPaymentStatus(PaymentStatus paymentStatus);

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'PAID'", nativeQuery = true)
    long sumPaidAmount();

    @Query(value = "SELECT COUNT(*) FROM refunds WHERE refund_status = 'PENDING'", nativeQuery = true)
    long countRefundPending();
}
