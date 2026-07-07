package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.SessionProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * HTTP·WebSocket 공용 유휴 세션 생존성 판정.
 * kill-switch OFF / sessionId 미보유(구 토큰) → 검증 skip(true), 그 외 touchSession 위임.
 */
class SessionLivenessCheckerTest {

    private RefreshTokenStore refreshTokenStore;
    private SessionProperties sessionProperties;
    private SessionLivenessChecker checker;

    @BeforeEach
    void setUp() {
        refreshTokenStore = mock(RefreshTokenStore.class);
        sessionProperties = new SessionProperties(); // existence-check on, idle 60m
        checker = new SessionLivenessChecker(refreshTokenStore, sessionProperties);
    }

    @Test
    void 세션이_살아있으면_true_반환하고_touchSession_위임() {
        when(refreshTokenStore.touchSession(eq(AccountType.USER), eq("sub"), eq("sess"),
                any(Duration.class), eq(false))).thenReturn(true);

        assertThat(checker.isAliveOrSkip(AccountType.USER, "sub", "sess", false)).isTrue();
    }

    @Test
    void 세션이_부재하면_false() {
        when(refreshTokenStore.touchSession(eq(AccountType.USER), eq("sub"), eq("sess"),
                any(Duration.class), eq(false))).thenReturn(false);

        assertThat(checker.isAliveOrSkip(AccountType.USER, "sub", "sess", false)).isFalse();
    }

    @Test
    void killswitch_off면_검증_skip하고_true() {
        sessionProperties.setExistenceCheckEnabled(false);

        assertThat(checker.isAliveOrSkip(AccountType.USER, "sub", "sess", false)).isTrue();
        verifyNoInteractions(refreshTokenStore);
    }

    @Test
    void sessionId_미보유_구토큰이면_검증_skip하고_true() {
        assertThat(checker.isAliveOrSkip(AccountType.USER, "sub", null, false)).isTrue();
        assertThat(checker.isAliveOrSkip(AccountType.USER, "sub", "", false)).isTrue();
        verifyNoInteractions(refreshTokenStore);
    }
}
