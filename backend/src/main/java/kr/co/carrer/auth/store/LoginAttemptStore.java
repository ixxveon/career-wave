package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Redis key: login:fail:{accountType}:{loginKey}
 * value: 실패 횟수(문자열)
 * TTL: 30분 — 카운트 자체의 유효기간 (locked_until은 DB에 별도 저장)
 *
 * 잠금 상태(locked_until)는 DB 저장 — Redis 장애에도 유지되는 계정 권위 상태.
 * 실패 카운트는 Redis 전용 — 고빈도·임시 데이터.
 */
@Component
@RequiredArgsConstructor
public class LoginAttemptStore {

    private static final String PREFIX = "login:fail:";
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;

    /** 실패 횟수 1 증가 후 현재 값 반환 */
    public long increment(AccountType accountType, String loginKey) {
        String key = buildKey(accountType, loginKey);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, TTL);
        }
        return count != null ? count : 1L;
    }

    public long getCount(AccountType accountType, String loginKey) {
        String value = redisTemplate.opsForValue().get(buildKey(accountType, loginKey));
        return value != null ? Long.parseLong(value) : 0L;
    }

    /** 로그인 성공 또는 잠금 복구 시 카운트 초기화 */
    public void clear(AccountType accountType, String loginKey) {
        redisTemplate.delete(buildKey(accountType, loginKey));
    }

    public int getMaxAttempts() {
        return MAX_ATTEMPTS;
    }

    private String buildKey(AccountType accountType, String loginKey) {
        return PREFIX + accountType.name() + ":" + loginKey;
    }
}
