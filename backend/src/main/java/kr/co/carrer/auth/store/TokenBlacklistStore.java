package kr.co.carrer.auth.store;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Redis key: blacklist:{jti}
 * value: "1" (존재 여부만 확인)
 * TTL: access token 잔여 수명
 * 로그아웃 전용 — 제재/정지는 AccountStatusAuthorizationFilter에서 처리
 */
@Component
@RequiredArgsConstructor
public class TokenBlacklistStore {

    private static final String PREFIX = "blacklist:";

    private final StringRedisTemplate redisTemplate;

    public void add(String jti, Duration ttl) {
        if (ttl.isNegative() || ttl.isZero()) return;
        redisTemplate.opsForValue().set(PREFIX + jti, "1", ttl);
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}
