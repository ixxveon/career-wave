package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.BillingConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BillingConsentRepository extends JpaRepository<BillingConsent, UUID> {

    @Query("SELECT c FROM BillingConsent c WHERE c.memberId = :memberId AND c.planId = :planId " +
           "AND c.revokedAt IS NULL ORDER BY c.agreedAt DESC")
    Optional<BillingConsent> findActiveConsent(@Param("memberId") UUID memberId,
                                                @Param("planId") Long planId);
}
