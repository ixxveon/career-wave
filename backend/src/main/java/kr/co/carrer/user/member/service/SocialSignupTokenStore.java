package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.type.SocialProvider;

import java.util.Optional;

public interface SocialSignupTokenStore {

    record SocialSignupPayload(
            SocialProvider provider,
            String providerUserId,
            String providerEmail   // nullable
    ) {}

    /**
     * socialSignupToken 발급 및 Redis 저장.
     * key: user-auth:social-signup:{tokenHash}, TTL 10분, raw token 저장 금지.
     * @return raw socialSignupToken (응답 body에만 포함, Redis에는 hash 저장)
     */
    String issue(SocialProvider provider, String providerUserId, String providerEmail);

    /**
     * token 소비 — 검증 성공 시 Redis key 즉시 삭제 (1회 사용 보장).
     * 만료·위조·불일치 시 empty 반환.
     */
    Optional<SocialSignupPayload> consume(String rawToken);
}
