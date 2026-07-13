package kr.co.carrer.auth.store;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * IP 기준 로그인/인증 요청 레이트 리밋 카운터.
 *
 * Redis key: login:rate:{scope}:{ip}  (scope = 보호 대상 엔드포인트 경로)
 * value: 현재 윈도우 내 요청 횟수(문자열)
 * TTL: 윈도우 길이 — 고정 윈도우(fixed window) 방식. 윈도우 경과 시 키 만료로 카운트 리셋.
 *
 * 계정 단위 잠금(LoginAttemptStore)은 특정 계정 대상 무차별 대입을 막지만,
 * 서로 다른 계정을 번갈아 시도하는 크리덴셜 스터핑/열거는 못 막는다.
 * 이 스토어는 IP 단위로 요청 자체를 제한해 그 공백을 메운다.
 */
@Component
@RequiredArgsConstructor
public class LoginRateLimitStore {

    private static final String PREFIX = "login:rate:";

    private final StringRedisTemplate redisTemplate;

    /**
     * 현재 윈도우의 요청 횟수를 1 증가시키고 그 값을 반환한다.
     * 윈도우 첫 요청일 때만 TTL을 건다(고정 윈도우).
     */
    public long increment(String scope, String ip, Duration window) {
        String key = PREFIX + scope + ":" + ip;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, window);
        }
        return count != null ? count : 1L;
    }
}
