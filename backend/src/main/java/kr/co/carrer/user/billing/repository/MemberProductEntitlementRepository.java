package kr.co.carrer.user.billing.repository;

import jakarta.persistence.LockModeType;
import kr.co.carrer.user.billing.entity.MemberProductEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberProductEntitlementRepository extends JpaRepository<MemberProductEntitlement, UUID> {

    Optional<MemberProductEntitlement> findByMemberIdAndProductCode(UUID memberId, String productCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM MemberProductEntitlement e WHERE e.memberId = :memberId AND e.productCode = :productCode")
    Optional<MemberProductEntitlement> findByMemberIdAndProductCodeForUpdate(
            @Param("memberId") UUID memberId,
            @Param("productCode") String productCode);

    List<MemberProductEntitlement> findAllByMemberId(UUID memberId);
}
