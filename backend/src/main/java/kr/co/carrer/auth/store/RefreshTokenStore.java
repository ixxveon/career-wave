package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Set;

/**
 * Redis key: refresh:{accountType}:{subjectId}:{sessionId}
 * value: SHA-256(refreshToken) — 원문 저장 금지
 */
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String PREFIX = "refresh:";
    private static final int USER_SESSION_LIMIT = 5;

    private final StringRedisTemplate redisTemplate;

    public void save(AccountType accountType, String subjectId, String sessionId,
                     String refreshToken, Duration ttl) {
        String key = buildKey(accountType, subjectId, sessionId);
        redisTemplate.opsForValue().set(key, hash(refreshToken), ttl);
    }

    public String get(AccountType accountType, String subjectId, String sessionId) {
        return redisTemplate.opsForValue().get(buildKey(accountType, subjectId, sessionId));
    }

    public void rotate(AccountType accountType, String subjectId, String sessionId,
                       String newRefreshToken, Duration ttl) {
        String key = buildKey(accountType, subjectId, sessionId);
        redisTemplate.opsForValue().set(key, hash(newRefreshToken), ttl);
    }

    public void delete(AccountType accountType, String subjectId, String sessionId) {
        redisTemplate.delete(buildKey(accountType, subjectId, sessionId));
    }

    /** 해당 subject의 모든 세션 삭제 — 재사용 탐지 시 전체 폐기 */
    public void deleteAll(AccountType accountType, String subjectId) {
        String pattern = PREFIX + accountType.name() + ":" + subjectId + ":*";
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    public boolean matches(AccountType accountType, String subjectId, String sessionId, String refreshToken) {
        String stored = get(accountType, subjectId, sessionId);
        return stored != null && stored.equals(hash(refreshToken));
    }

    /**
     * USER 5세션 상한 — 초과 시 가장 오래된(TTL이 가장 짧은) 세션 키 반환
     * 호출 측에서 해당 key의 access jti를 blacklist에 등록 후 삭제해야 함
     */
    public List<String> enforceSessionLimit(AccountType accountType, String subjectId) {
        String pattern = PREFIX + accountType.name() + ":" + subjectId + ":*";
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys == null || keys.size() < USER_SESSION_LIMIT) return List.of();

        // TTL이 가장 짧은 세션(가장 오래된)부터 삭제 대상 반환
        return keys.stream()
                .sorted((a, b) -> {
                    Long ttlA = redisTemplate.getExpire(a);
                    Long ttlB = redisTemplate.getExpire(b);
                    return Long.compare(ttlA == null ? 0 : ttlA, ttlB == null ? 0 : ttlB);
                })
                .limit(keys.size() - USER_SESSION_LIMIT + 1)
                .toList();
    }

    public static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String buildKey(AccountType accountType, String subjectId, String sessionId) {
        return PREFIX + accountType.name() + ":" + subjectId + ":" + sessionId;
    }
}
