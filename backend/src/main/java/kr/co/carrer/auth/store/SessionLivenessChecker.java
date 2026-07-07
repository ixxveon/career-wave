package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.SessionProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * HTTP 필터(JwtAuthenticationFilter)와 WebSocket 핸드셰이크(WebSocketJwtAuthenticator)가
 * 공유하는 유휴 세션 생존성 판정. 유휴 타임아웃 정책을 한 곳에 모아 HTTP·WS 인증 경로를 정렬한다.
 *
 * skip 규칙: kill-switch OFF이거나 sessionId 미보유(배포 과도기 구 토큰)면 검증을 건너뛰고 통과(true).
 */
@Component
@RequiredArgsConstructor
public class SessionLivenessChecker {

    private final RefreshTokenStore refreshTokenStore;
    private final SessionProperties sessionProperties;

    /**
     * @param conservativeOnFailure Redis 장애 시 정책 — true(Admin): 거부, false(User): fail-open
     * @return 세션이 유효하거나 검증 대상이 아니면 true, 유휴 만료/부재면 false
     */
    public boolean isAliveOrSkip(AccountType accountType, String subject, String sessionId,
                                 boolean conservativeOnFailure) {
        if (!sessionProperties.isExistenceCheckEnabled() || !StringUtils.hasText(sessionId)) {
            return true;
        }
        return refreshTokenStore.touchSession(accountType, subject, sessionId,
                Duration.ofMillis(sessionProperties.getIdleTimeout()), conservativeOnFailure);
    }
}
