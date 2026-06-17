package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    // token_hash로 조회 — 비밀번호 재설정 권한 검증 시 사용 (isUsed() · isExpired()로 유효성 확인)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    // 중복 발급 방지 — 특정 회원에게 아직 사용되지 않고 만료되지 않은 token이 존재하는지 확인
    boolean existsByMemberIdAndUsedAtIsNullAndExpiresAtAfter(UUID memberId, Instant now);
}
