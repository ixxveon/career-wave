package kr.co.carrer.admin.member.repository;

import kr.co.carrer.admin.member.entity.HrManager;
import kr.co.carrer.admin.member.type.HrStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface HrManagerRepository extends JpaRepository<HrManager, Long>, JpaSpecificationExecutor<HrManager> {

    Optional<HrManager> findByMemberId(UUID memberId);

    long countByHrStatus(HrStatus hrStatus);

    @Query("""
        SELECT h FROM HrManager h
        JOIN Member m ON m.memberId = h.memberId
        WHERE h.memberId = :memberId
        """)
    Optional<HrManager> findByMemberIdWithMember(UUID memberId);
}
