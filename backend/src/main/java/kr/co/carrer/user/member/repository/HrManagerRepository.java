package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.HrManager;
import kr.co.carrer.user.member.type.HrStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface HrManagerRepository extends JpaRepository<HrManager, Long> {

    Optional<HrManager> findByMemberId(UUID memberId);

    Optional<HrManager> findByMemberIdAndHrStatus(UUID memberId, HrStatus hrStatus);
}
