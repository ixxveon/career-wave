package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPaymentRepository extends JpaRepository<UserPayment, UUID> {

    Optional<UserPayment> findByOrderId(String orderId);

    Optional<UserPayment> findByOrderIdAndMemberId(String orderId, UUID memberId);

    @Query("SELECT p FROM UserPayment p WHERE p.memberId = :memberId AND p.planId = :planId " +
           "AND p.paymentStatus = 'READY'")
    Optional<UserPayment> findReadyByMemberIdAndPlanId(@Param("memberId") UUID memberId,
                                                        @Param("planId") Long planId);

    @Query("SELECT p FROM UserPayment p WHERE p.paymentStatus = 'READY' " +
           "AND p.expiresAt <= :now")
    List<UserPayment> findExpiredReadyOrders(@Param("now") ZonedDateTime now);

    boolean existsByMemberIdAndPlanIdAndPaymentStatus(UUID memberId, Long planId,
                                                       UserPaymentStatus paymentStatus);

    Optional<UserPayment> findByIdempotencyKey(String idempotencyKey);
}
