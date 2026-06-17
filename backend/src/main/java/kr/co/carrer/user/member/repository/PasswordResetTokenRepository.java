package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    // token_hash로 조회 — 비밀번호 재설정 권한 검증 시 사용
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    // 사용하지 않은 유효 token 존재 여부 — 중복 발급 방지 용도
    boolean existsByTokenHashAndUsedAtIsNull(String tokenHash);
}
