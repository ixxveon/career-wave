package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * touchSession — 존재성 확인 + 슬라이딩 갱신을 단일 원자 EXPIRE로 처리.
 * EXPIRE true=키 존재(갱신됨)=세션 유효, false=키 부재=세션 만료/퇴출.
 * Redis 장애 시 fail-open(User)/보수적 거부(Admin).
 */
class RefreshTokenStoreTest {

    private static final Duration IDLE = Duration.ofMinutes(60);

    private StringRedisTemplate redisTemplate;
    private RefreshTokenStore store;

    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        store = new RefreshTokenStore(redisTemplate);
    }

    @Test
    void touchSession_키_존재하면_TTL을_idle로_갱신하고_true() {
        when(redisTemplate.expire(anyString(), eq(IDLE))).thenReturn(true);

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, false);

        assertThat(alive).isTrue();
        verify(redisTemplate).expire(anyString(), eq(IDLE)); // 매 요청 full idle 창으로 재설정
    }

    @Test
    void touchSession_키_부재면_세션만료_false() {
        when(redisTemplate.expire(anyString(), eq(IDLE))).thenReturn(false);

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, false);

        assertThat(alive).isFalse();
    }

    @Test
    void touchSession_Redis장애시_사용자는_fail_open_true() {
        when(redisTemplate.expire(anyString(), any(Duration.class)))
                .thenThrow(new QueryTimeoutException("redis down"));

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, false);

        assertThat(alive).isTrue(); // 가용성 우선
    }

    @Test
    void touchSession_Redis장애시_관리자는_보수적_거부_false() {
        when(redisTemplate.expire(anyString(), any(Duration.class)))
                .thenThrow(new QueryTimeoutException("redis down"));

        boolean alive = store.touchSession(AccountType.ADMIN, "sub", "sess", IDLE, true);

        assertThat(alive).isFalse(); // 보수적 거부
    }
}
