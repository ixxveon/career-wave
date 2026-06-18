package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.CompanyProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, UUID> {

    boolean existsByBusinessNumber(String businessNumber);

    Optional<CompanyProfile> findByMemberId(UUID memberId);
}
