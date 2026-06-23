package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.BillingConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BillingConsentRepository extends JpaRepository<BillingConsent, UUID> {

    Optional<BillingConsent> findFirstByMemberIdAndPlanIdAndRevokedAtIsNullOrderByAgreedAtDesc(
            UUID memberId, Long planId);
}
