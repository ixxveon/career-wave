package kr.co.carrer.user.billing.repository;

import jakarta.persistence.LockModeType;
import kr.co.carrer.user.billing.entity.SubscriptionUsagePeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionUsagePeriodRepository extends JpaRepository<SubscriptionUsagePeriod, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM SubscriptionUsagePeriod p WHERE p.subscriptionId = :subscriptionId " +
           "AND p.periodStart <= :now AND p.periodEnd > :now")
    Optional<SubscriptionUsagePeriod> findCurrentPeriodForUpdate(@Param("subscriptionId") UUID subscriptionId,
                                                                   @Param("now") ZonedDateTime now);

    @Query("SELECT p FROM SubscriptionUsagePeriod p WHERE p.subscriptionId = :subscriptionId " +
           "AND p.periodStart <= :now AND p.periodEnd > :now")
    Optional<SubscriptionUsagePeriod> findCurrentPeriod(@Param("subscriptionId") UUID subscriptionId,
                                                          @Param("now") ZonedDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM SubscriptionUsagePeriod p WHERE p.usagePeriodId = :usagePeriodId")
    Optional<SubscriptionUsagePeriod> findByUsagePeriodIdForUpdate(
            @Param("usagePeriodId") UUID usagePeriodId);

    @Query("SELECT p FROM SubscriptionUsagePeriod p WHERE p.subscriptionId IN :subscriptionIds " +
           "AND p.periodStart <= :now AND p.periodEnd > :now")
    List<SubscriptionUsagePeriod> findCurrentPeriodsForSubscriptions(
            @Param("subscriptionIds") List<UUID> subscriptionIds,
            @Param("now") ZonedDateTime now);
}
