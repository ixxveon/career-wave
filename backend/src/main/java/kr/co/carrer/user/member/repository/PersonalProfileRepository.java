package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.PersonalProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PersonalProfileRepository extends JpaRepository<PersonalProfile, Long> {

    Optional<PersonalProfile> findByMemberId(UUID memberId);
}
