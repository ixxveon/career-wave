package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.SocialAccount;
import kr.co.carrer.user.member.type.SocialProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, UUID> {

    // 소셜 로그인 시 기존 계정 조회 — provider + providerUserId 복합 식별
    Optional<SocialAccount> findByProviderAndProviderUserId(SocialProvider provider, String providerUserId);

    // 소셜 계정 연결 중복 여부 확인
    boolean existsByProviderAndProviderUserId(SocialProvider provider, String providerUserId);

    // 특정 회원의 특정 provider 연결 여부 확인
    boolean existsByMemberIdAndProvider(UUID memberId, SocialProvider provider);
}
