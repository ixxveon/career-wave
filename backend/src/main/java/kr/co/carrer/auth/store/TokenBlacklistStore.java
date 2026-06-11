package kr.co.carrer.auth.store;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Redis key: blacklist:{jti}
 * value: "1" (존재 여부만 확인)
 * TTL: access token 잔여 수명 + LEEWAY_SECONDS
 * 로그아웃 전용 — 제재/정지는 AccountStatusAuthorizationFilter에서 처리
 *
 * Redis 장애 정책:
 * - isBlacklisted() 조회 실패 시 → 사용자: 통과 허용(가용성 우선), 관리자: 호출부에서 보수적 거부
 * - add() 실패 시 → 예외 삼키고 log.warn (logout 자체는 성공 처리, refresh key 삭제는 완료)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenBlacklistStore {

    private static final String PREFIX = "blacklist:";

    private final StringRedisTemplate redisTemplate;

    public void add(String jti, Duration ttl) {
        if (ttl.isNegative() || ttl.isZero()) return;
        try {
            redisTemplate.opsForValue().set(PREFIX + jti, "1", ttl);
        } catch (DataAccessException e) {
            log.warn("[blacklist] Redis 쓰기 실패 — jti={}, 로그아웃은 완료 처리됨: {}", jti, e.getMessage());
        }
    }

    public boolean isBlacklisted(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}
