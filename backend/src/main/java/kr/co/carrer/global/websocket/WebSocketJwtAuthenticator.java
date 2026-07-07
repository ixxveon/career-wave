package kr.co.carrer.global.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.SessionLivenessChecker;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * WebSocket 핸드셰이크 / STOMP CONNECT 단계에서 HTTP JWT 검증과 동일한 정책을 적용한다.
 * - 서명 + audience + accountType 검증: JwtTokenProvider.parse() 재사용
 * - jti 존재 여부 확인
 * - blacklist(로그아웃) 확인: TokenBlacklistStore 재사용
 * - 계정 상태(정지·탈퇴 등) 확인: AccountStatusPort 구현체 위임
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketJwtAuthenticator {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final SessionLivenessChecker sessionLivenessChecker;
    private final List<AccountStatusPort> accountStatusPorts;

    /**
     * USER 토큰을 검증하고 memberId를 반환한다.
     *
     * @param token Bearer 접두어 없이 순수 JWT 문자열
     * @return 유효하면 memberId, 유효하지 않으면 empty
     */
    public Optional<UUID> authenticate(String token) {
        if (!StringUtils.hasText(token)) {
            return Optional.empty();
        }
        try {
            Claims claims = jwtTokenProvider.parse(token, AccountType.USER);

            String jti = claims.get("jti", String.class);
            if (!StringUtils.hasText(jti)) {
                log.debug("[WebSocket JWT 거부] jti claim 누락");
                return Optional.empty();
            }

            // 사용자 WebSocket은 HTTP 사용자 정책과 동일하게 가용성 우선 (Redis 장애 시 허용)
            if (tokenBlacklistStore.isBlacklisted(jti, false)) {
                log.debug("[WebSocket JWT 거부] blacklist 등록된 토큰 (로그아웃): jti={}", jti);
                return Optional.empty();
            }

            String subject = claims.getSubject();

            // 유휴 세션 타임아웃: HTTP 필터와 동일 정책(SessionLivenessChecker)으로 핸드셰이크 시 검증(유휴 우회 차단).
            // 사용자 정책이므로 fail-open. sessionId 미보유·kill-switch는 checker 내부에서 skip.
            String sessionId = claims.get("sessionId", String.class);
            if (!sessionLivenessChecker.isAliveOrSkip(AccountType.USER, subject, sessionId, false)) {
                log.debug("[WebSocket JWT 거부] 유휴 만료 세션: sessionId={}", sessionId);
                return Optional.empty();
            }

            accountStatusPorts.stream()
                    .filter(port -> port.supports(AccountType.USER))
                    .findFirst()
                    .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED))
                    .validateActive(subject);

            return Optional.of(UUID.fromString(subject));

        } catch (CustomException e) {
            log.debug("[WebSocket JWT 거부] 계정 상태 검증 실패: {}", e.getMessage());
            return Optional.empty();
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("[WebSocket JWT 검증 실패] {}", e.getMessage());
            return Optional.empty();
        }
    }
}
