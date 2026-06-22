package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BillingProfileRepository extends JpaRepository<BillingProfile, UUID> {

    Optional<BillingProfile> findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
            UUID memberId, BillingProfileStatus status);

    Optional<BillingProfile> findByCustomerKey(String customerKey);
}
