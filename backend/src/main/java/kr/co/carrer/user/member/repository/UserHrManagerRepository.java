package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.UserHrManager;
import kr.co.carrer.user.member.type.HrStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserHrManagerRepository extends JpaRepository<UserHrManager, Long> {

    Optional<UserHrManager> findByMemberId(UUID memberId);

    Optional<UserHrManager> findByMemberIdAndHrStatus(UUID memberId, HrStatus hrStatus);
}
