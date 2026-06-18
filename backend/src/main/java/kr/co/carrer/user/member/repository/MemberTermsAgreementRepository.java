package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.MemberTermsAgreement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MemberTermsAgreementRepository extends JpaRepository<MemberTermsAgreement, Long> {

    Optional<MemberTermsAgreement> findByMemberId(UUID memberId);
}
