package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Redis key: refresh:{accountType}:{subjectId}:{sessionId}
 * value: SHA-256(refreshToken) — 원문 저장 금지
 *
 * access jti key: session_jti:{accountType}:{subjectId}:{sessionId}
 * value: jti — 세션 퇴출/단일 세션 정책 시 access token blacklist 등록용
 */
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String PREFIX     = "refresh:";
    private static final String JTI_PREFIX = "session_jti:";
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

    /** 해당 subject의 모든 refresh 세션 삭제 — 재사용 탐지 시 전체 폐기 */
    public void deleteAll(AccountType accountType, String subjectId) {
        Set<String> keys = scanKeys(PREFIX + accountType.name() + ":" + subjectId + ":*");
        if (!keys.isEmpty()) redisTemplate.delete(keys);
    }

    public boolean matches(AccountType accountType, String subjectId, String sessionId, String refreshToken) {
        String stored = get(accountType, subjectId, sessionId);
        return stored != null && stored.equals(hash(refreshToken));
    }

    // ── access jti 관리 ────────────────────────────────────────────────────

    /** 로그인 시 access token의 jti를 세션별로 저장 — 세션 퇴출 시 blacklist 등록에 사용 */
    public void saveAccessJti(AccountType accountType, String subjectId, String sessionId,
                              String jti, Duration ttl) {
        redisTemplate.opsForValue().set(
                JTI_PREFIX + accountType.name() + ":" + subjectId + ":" + sessionId,
                jti, ttl
        );
    }

    /** jti를 조회하고 즉시 삭제 — 퇴출 세션의 access token을 blacklist 등록할 때 호출 */
    public String getAndDeleteAccessJti(AccountType accountType, String subjectId, String sessionId) {
        String key = JTI_PREFIX + accountType.name() + ":" + subjectId + ":" + sessionId;
        String jti = redisTemplate.opsForValue().get(key);
        if (jti != null) redisTemplate.delete(key);
        return jti;
    }

    /**
     * USER 5세션 상한 — 초과 시 가장 오래된(TTL이 가장 짧은) 세션 키 반환
     * 호출 측에서 getAndDeleteAccessJti() 로 jti를 꺼내 blacklist 등록 후 delete() 호출해야 함
     */
    public List<String> enforceSessionLimit(AccountType accountType, String subjectId) {
        Set<String> keys = scanKeys(PREFIX + accountType.name() + ":" + subjectId + ":*");
        if (keys.size() < USER_SESSION_LIMIT) return List.of();

        return keys.stream()
                .sorted((a, b) -> {
                    Long ttlA = redisTemplate.getExpire(a);
                    Long ttlB = redisTemplate.getExpire(b);
                    return Long.compare(ttlA == null ? 0 : ttlA, ttlB == null ? 0 : ttlB);
                })
                .limit(keys.size() - USER_SESSION_LIMIT + 1)
                .toList();
    }

    /** 해당 subject의 모든 sessionId 목록 반환 — admin 단일 세션 정책 시 jti 수집용 */
    public List<String> getAllSessionIds(AccountType accountType, String subjectId) {
        return scanKeys(PREFIX + accountType.name() + ":" + subjectId + ":*")
                .stream()
                .map(k -> k.substring(k.lastIndexOf(':') + 1))
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

    private Set<String> scanKeys(String pattern) {
        Set<String> keys = new HashSet<>();
        ScanOptions opts = ScanOptions.scanOptions().match(pattern).count(100).build();
        try (Cursor<String> cursor = redisTemplate.scan(opts)) {
            cursor.forEachRemaining(keys::add);
        }
        return keys;
    }
}
