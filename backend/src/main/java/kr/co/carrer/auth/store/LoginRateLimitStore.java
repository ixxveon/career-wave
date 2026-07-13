package kr.co.carrer.auth.store;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

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

    /**
     * INCR과 최초 TTL 설정을 하나의 Lua 스크립트로 원자화한다.
     * INCR 직후 프로세스/커넥션이 끊겨 EXPIRE가 누락되면 TTL 없는 키가 영구히 남아
     * 해당 IP·경로가 사실상 영구 차단(429)되는 문제를 방지한다.
     */
    private static final RedisScript<Long> INCR_WITH_TTL = RedisScript.of(
            "local c = redis.call('INCR', KEYS[1]) "
                    + "if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end "
                    + "return c",
            Long.class);

    private final StringRedisTemplate redisTemplate;

    /**
     * 현재 윈도우의 요청 횟수를 1 증가시키고 그 값을 반환한다.
     * 윈도우 첫 요청일 때만 TTL을 건다(고정 윈도우) — 증가와 TTL 설정은 원자적으로 수행된다.
     */
    public long increment(String scope, String ip, Duration window) {
        String key = PREFIX + scope + ":" + ip;
        Long count = redisTemplate.execute(
                INCR_WITH_TTL, List.of(key), String.valueOf(window.toMillis()));
        return count != null ? count : 1L;
    }
}
