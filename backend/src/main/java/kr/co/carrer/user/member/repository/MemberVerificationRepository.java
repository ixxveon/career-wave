package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.type.VerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MemberVerificationRepository extends JpaRepository<MemberVerification, UUID> {

    // 인증 완료 토큰으로 조회 — verificationToken 유효성 검증 시 사용
    Optional<MemberVerification> findByVerificationToken(String verificationToken);

    // 재발송 가능 여부 및 rate limit 체크 — 동일 target + purpose 최신 레코드 조회
    Optional<MemberVerification> findTopByTargetAndPurposeOrderByCreatedAtDesc(
            String target, VerificationPurpose purpose);
}
