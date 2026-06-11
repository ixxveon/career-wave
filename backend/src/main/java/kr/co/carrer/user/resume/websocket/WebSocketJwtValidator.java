package kr.co.carrer.user.resume.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

/**
 * WebSocket 핸드셰이크 / STOMP 연결 시 JWT를 검증하는 내부 유틸.
 * 전역 JWT 필터(팀원 작업)와 별개로 WebSocket 경로에서만 사용한다.
 */
@Slf4j
@Component
public class WebSocketJwtValidator {

    private final SecretKey secretKey;

    public WebSocketJwtValidator(@Value("${jwt.user.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * @param token Bearer 접두어 없이 순수 JWT 문자열
     * @return 유효하면 memberId, 유효하지 않으면 empty
     */
    public Optional<UUID> extractMemberId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String subject = claims.getSubject();
            return Optional.of(UUID.fromString(subject));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("[WebSocket JWT 검증 실패] {}", e.getMessage());
            return Optional.empty();
        }
    }
}
