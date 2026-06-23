package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.Subscription;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.LockModeType;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findBySubscriptionId(UUID subscriptionId);

    Optional<Subscription> findBySubscriptionIdAndMemberId(UUID subscriptionId, UUID memberId);

    @Query("SELECT s FROM Subscription s WHERE s.memberId = :memberId AND s.planId = :planId " +
           "AND s.subscriptionStatus IN :statuses " +
           "ORDER BY s.createdAt DESC")
    List<Subscription> findActiveLikeByMemberIdAndPlanId(@Param("memberId") UUID memberId,
                                                          @Param("planId") Long planId,
                                                          @Param("statuses") Set<SubscriptionStatus> statuses);

    List<Subscription> findAllByMemberIdOrderByCreatedAtDesc(UUID memberId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Subscription s WHERE s.subscriptionId = :subscriptionId AND s.memberId = :memberId")
    Optional<Subscription> findBySubscriptionIdAndMemberIdForUpdate(
            @Param("subscriptionId") UUID subscriptionId,
            @Param("memberId") UUID memberId);

    @Query("SELECT s FROM Subscription s WHERE s.subscriptionStatus = :status " +
           "AND s.nextBillingAt <= :threshold AND s.autoRenew = true")
    List<Subscription> findDueBillings(@Param("status") SubscriptionStatus status,
                                        @Param("threshold") ZonedDateTime threshold);

    @Query("SELECT s FROM Subscription s WHERE s.subscriptionStatus = :status " +
           "AND s.paymentFailedAt IS NOT NULL AND s.autoRenew = true")
    List<Subscription> findPaymentFailedSubscriptions(@Param("status") SubscriptionStatus status);
}
