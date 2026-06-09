package kr.co.carrer.global.auth.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public String createAccessToken(String subject, AccountType accountType, String roleType, String adminRole) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        return buildToken(subject, accountType, roleType, adminRole, config.getSecret(), config.getAccessExpiration());
    }

    public String createRefreshToken(String subject, AccountType accountType, String adminRole) {
        JwtProperties.TokenConfig config = resolveConfig(accountType);
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(subject)
                .claim("accountType", accountType.name())
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + config.getRefreshExpiration()))
                .signWith(resolveKey(config.getSecret()));

        if (adminRole != null) {
            builder.claim("adminRole", adminRole);
        }

        return builder.compact();
    }

    public Claims parse(String token, AccountType accountType) {
        SecretKey key = resolveKey(resolveConfig(accountType).getSecret());
        return Jwts.parser()
                .verifyWith(key)
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
        // accountType claim 파싱 (서명 검증 없이 payload만 읽음 — 검증 전 타입 분기용)
        String[] parts = token.split("\\.");
        if (parts.length < 2) throw new IllegalArgumentException("Invalid JWT format");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        // 간단 파싱: "accountType":"USER" 추출
        for (AccountType type : AccountType.values()) {
            if (payload.contains("\"accountType\":\"" + type.name() + "\"")) return type;
        }
        throw new IllegalArgumentException("Unknown accountType in token");
    }

    private String buildToken(String subject, AccountType accountType, String roleType,
                               String adminRole, String secret, long expirationMs) {
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(subject)
                .claim("accountType", accountType.name())
                .claim("roleType", roleType)
                .claim("roles", List.of(roleType))
                .claim("jti", UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(resolveKey(secret));

        if (adminRole != null) {
            builder.claim("adminRole", adminRole);
        }

        return builder.compact();
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
