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
        return builder.compact();
    }

    /**
     * @param sessionId UUID — RefreshTokenStore의 Redis key 구성에 사용
     */
    public String createRefreshToken(String subject, AccountType accountType,
                                     String adminRole, String sessionId) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(subject)
                .audience().add(resolveAud(accountType)).and()
                .claim("accountType", accountType.name())
                .claim("sessionId", sessionId)
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + config.getRefreshExpiration()))
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
        long remaining = expiration.toInstant().getEpochSecond() - Instant.now().getEpochSecond();
        return remaining > 0 ? Duration.ofSeconds(remaining) : Duration.ZERO;
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
