package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.type.BillingProfileStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BillingProfileRepository extends JpaRepository<BillingProfile, UUID> {

    Optional<BillingProfile> findFirstByMemberIdAndBillingProfileStatusOrderByCreatedAtDesc(
            UUID memberId, BillingProfileStatus status);

    Optional<BillingProfile> findByCustomerKey(String customerKey);

    // 자동결제 배치 선로딩용 — 여러 회원의 프로파일을 IN 절로 한 번에 조회 (건별 N+1 제거)
    List<BillingProfile> findByMemberIdInAndBillingProfileStatus(
            Collection<UUID> memberIds, BillingProfileStatus status);
}
