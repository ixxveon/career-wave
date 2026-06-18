package kr.co.carrer.user.member.infrastructure.social;

import kr.co.carrer.user.member.service.SocialSignupTokenStore;
import kr.co.carrer.user.member.type.SocialProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Redis key: user-auth:social-signup:{tokenHash}
 * value: "{provider}|{providerUserId}|{providerEmail}"  — providerEmail은 빈 문자열 허용
 * TTL: 10분, 소비(consume) 즉시 삭제 (1회 사용 보장)
 * raw token은 key에 hash만 사용, value에 포함하지 않음
 */
@Component
@RequiredArgsConstructor
public class RedisSocialSignupTokenStore implements SocialSignupTokenStore {

    private static final String KEY_PREFIX = "user-auth:social-signup:";
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final int TOKEN_BYTES = 32;

    private final StringRedisTemplate redisTemplate;

    @Override
    public String issue(SocialProvider provider, String providerUserId, String providerEmail) {
        String rawToken = generateRawToken();
        String tokenHash = hash(rawToken);
        String value = provider.name() + "|" + providerUserId + "|"
                + (providerEmail != null ? providerEmail : "");
        redisTemplate.opsForValue().set(KEY_PREFIX + tokenHash, value, TTL);
        return rawToken;
    }

    @Override
    public Optional<SocialSignupPayload> consume(String rawToken) {
        String tokenHash = hash(rawToken);
        String key = KEY_PREFIX + tokenHash;
        // getAndDelete: 조회+삭제 원자 실행 — 동시 요청 시 두 번째 호출은 null 반환 (1회 소비 보장)
        String value = redisTemplate.opsForValue().getAndDelete(key);
        if (value == null) return Optional.empty();

        String[] parts = value.split("\\|", -1);
        if (parts.length < 2) return Optional.empty();

        SocialProvider provider;
        try {
            provider = SocialProvider.valueOf(parts[0]);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }

        String providerUserId = parts[1];
        String providerEmail = parts.length >= 3 && !parts[2].isBlank() ? parts[2] : null;
        return Optional.of(new SocialSignupPayload(provider, providerUserId, providerEmail));
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
