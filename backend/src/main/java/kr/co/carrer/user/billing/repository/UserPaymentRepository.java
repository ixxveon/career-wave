package kr.co.carrer.user.billing.repository;

import jakarta.persistence.LockModeType;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface UserPaymentRepository extends JpaRepository<UserPayment, UUID> {

    Optional<UserPayment> findByOrderId(String orderId);

    Optional<UserPayment> findByOrderIdAndMemberId(String orderId, UUID memberId);

    @Query("SELECT p FROM UserPayment p WHERE p.memberId = :memberId AND p.planId = :planId " +
           "AND p.paymentStatus = 'READY'")
    Optional<UserPayment> findReadyByMemberIdAndPlanId(@Param("memberId") UUID memberId,
                                                        @Param("planId") Long planId);

    // createOrder 재사용 경로 전용 — READY 주문을 행 잠금으로 조회한다.
    // orderId 재발급(renewOrderForRetry)이 동시 요청 간 서로 덮어쓰지 않도록 read-renew-commit 을 직렬화한다.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM UserPayment p WHERE p.memberId = :memberId AND p.planId = :planId " +
           "AND p.paymentStatus = 'READY'")
    Optional<UserPayment> findReadyByMemberIdAndPlanIdForUpdate(@Param("memberId") UUID memberId,
                                                                @Param("planId") Long planId);

    @Query("SELECT p FROM UserPayment p WHERE p.paymentStatus = 'READY' " +
           "AND p.expiresAt <= :now")
    List<UserPayment> findExpiredReadyOrders(@Param("now") ZonedDateTime now);

    boolean existsByMemberIdAndPlanIdAndPaymentStatus(UUID memberId, Long planId,
                                                       UserPaymentStatus paymentStatus);

    Optional<UserPayment> findByIdempotencyKey(String idempotencyKey);

    // 자동결제 배치 선로딩용 — 여러 idempotencyKey를 IN 절로 한 번에 조회 (건별 findByIdempotencyKey N+1 제거)
    List<UserPayment> findByIdempotencyKeyIn(Collection<String> idempotencyKeys);

    // 대사 대상 ID 목록 배치 조회 — 락 없이 짧은 TX, reconcilingAt 오래된 건부터 처리
    @Query("SELECT p.paymentId FROM UserPayment p WHERE p.paymentStatus = 'RECONCILING' ORDER BY p.reconcilingAt ASC")
    List<UUID> findReconcilingPaymentIds(Pageable pageable);

    // 건별 비관적 락 — reconcileAsPaid REQUIRES_NEW TX 내에서 상태 확정 시 사용
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM UserPayment p WHERE p.paymentId = :paymentId")
    Optional<UserPayment> findByIdForUpdate(@Param("paymentId") UUID paymentId);

    @Query("SELECT p FROM UserPayment p WHERE p.memberId = :memberId " +
           "AND p.createdAt >= :from " +
           "AND p.paymentStatus IN :statuses")
    Page<UserPayment> findPaymentHistoryByMemberId(@Param("memberId") UUID memberId,
                                                   @Param("from") ZonedDateTime from,
                                                   @Param("statuses") Set<UserPaymentStatus> statuses,
                                                   Pageable pageable);
}
