package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
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
@Slf4j
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String PREFIX     = "refresh:";
    private static final String JTI_PREFIX = "session_jti:";
    private static final int USER_SESSION_LIMIT = 5;

    private final StringRedisTemplate redisTemplate;

    /**
     * 유휴 세션 존재성 확인 + 슬라이딩 TTL 갱신을 **단일 원자 EXPIRE 명령**으로 처리한다.
     * EXPIRE는 키가 있으면 TTL을 idleTtl로 재설정하고 true, 키가 없으면(유휴 만료/로그아웃/퇴출) false를 반환한다.
     * 매 요청 TTL을 idleTtl로 되돌리므로 활동 중 사용자는 항상 정확히 idle 창을 보장받는다(조기 만료 없음).
     *
     * @param conservativeOnFailure Redis 장애 시 정책 — true(관리자): 부재 간주(거부), false(사용자): 존재 간주(fail-open)
     * @return true=세션 유효(갱신됨), false=세션 부재
     */
    public boolean touchSession(AccountType accountType, String subjectId, String sessionId,
                                Duration idleTtl, boolean conservativeOnFailure) {
        String key = buildKey(accountType, subjectId, sessionId);
        try {
            return Boolean.TRUE.equals(redisTemplate.expire(key, idleTtl));
        } catch (DataAccessException e) {
            log.warn("[session] Redis 세션 갱신 실패 — subject={}, session={}: {}", subjectId, sessionId, e.getMessage());
            return !conservativeOnFailure; // 사용자: 허용(fail-open) / 관리자: 거부(보수적)
        }
    }

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
