package kr.co.carrer.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private static final String AUD_USER  = "user";
    private static final String AUD_ADMIN = "admin";
    private static final long   LEEWAY_SECONDS = 60L;

    private final JwtProperties jwtProperties;

    public String createAccessToken(String subject, AccountType accountType, String roleType, String adminRole) {
        return createAccessToken(subject, accountType, roleType, adminRole, null);
    }

    /**
     * @param sessionId 유휴 세션 타임아웃 검증용 — 필터가 이 값으로 Redis 세션 존재성/TTL을 확인한다.
     *                  null이면 sessionId claim 없이 발급(배포 과도기 구 토큰 호환 · 세션 무관 컨텍스트).
     */
    public String createAccessToken(String subject, AccountType accountType, String roleType,
                                    String adminRole, String sessionId) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(subject)
                .audience().add(resolveAud(accountType)).and()
                .claim("accountType", accountType.name())
                .claim("roleType", roleType)           // USER / COMPANY / ADMIN (ROLE_ prefix 없음)
                .claim("roles", List.of(roleType))
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + config.getAccessExpiration()))
                .signWith(resolveKey(config.getSecret()));

        if (adminRole != null) builder.claim("adminRole", adminRole);
        if (sessionId != null) builder.claim("sessionId", sessionId);
        return builder.compact();
    }

    /**
     * @param sessionId UUID — RefreshTokenStore의 Redis key 구성에 사용
     */
    public String createRefreshToken(String subject, AccountType accountType,
                                     String adminRole, String sessionId) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        Date expiration = new Date(System.currentTimeMillis() + config.getRefreshExpiration());
        return createRefreshToken(subject, accountType, adminRole, sessionId, expiration);
    }

    /**
     * 회전(rotation) 시 원본 만료 시각을 그대로 넘겨 절대 상한(로그인 시점 기준 refresh 만료)을 고정한다.
     * 이렇게 하지 않고 매 회전마다 exp를 now+refreshExpiration으로 갱신하면 절대 상한이 무한 연장된다.
     */
    public String createRefreshToken(String subject, AccountType accountType,
                                     String adminRole, String sessionId, Date expiration) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(subject)
                .audience().add(resolveAud(accountType)).and()
                .claim("accountType", accountType.name())
                .claim("sessionId", sessionId)
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(expiration)
                .signWith(resolveKey(config.getSecret()));

        if (adminRole != null) builder.claim("adminRole", adminRole);
        return builder.compact();
    }

    public Claims parse(String token, AccountType accountType) {
        SecretKey key = resolveKey(resolveConfig(accountType).getSecret());
        return Jwts.parser()
                .verifyWith(key)
                .clockSkewSeconds(LEEWAY_SECONDS)
                .requireAudience(resolveAud(accountType))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validate(String token, AccountType accountType) {
        try {
            parse(token, accountType);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public AccountType extractAccountType(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2) throw new IllegalArgumentException("Invalid JWT format");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        for (AccountType type : AccountType.values()) {
            if (payload.contains("\"accountType\":\"" + type.name() + "\"")) return type;
        }
        throw new IllegalArgumentException("Unknown accountType in token");
    }

    /** access token의 jti와 남은 TTL 반환 — blacklist 등록용 */
    public String extractJti(String token, AccountType accountType) {
        return parse(token, accountType).get("jti", String.class);
    }

    public Duration remainingTtl(String token, AccountType accountType) {
        Date expiration = parse(token, accountType).getExpiration();
        // parse()가 LEEWAY_SECONDS만큼 여유를 허용하므로 blacklist TTL도 동일하게 포함해야 한다.
        Duration remaining = Duration.between(Instant.now(), expiration.toInstant())
                .plusSeconds(LEEWAY_SECONDS);
        return remaining.isNegative() ? Duration.ZERO : remaining;
    }

    private String resolveAud(AccountType accountType) {
        return accountType == AccountType.ADMIN ? AUD_ADMIN : AUD_USER;
    }

    private JwtProperties.TokenConfig resolveConfig(AccountType accountType) {
        return accountType == AccountType.ADMIN
                ? jwtProperties.getAdmin()
                : jwtProperties.getUser();
    }

    private SecretKey resolveKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
