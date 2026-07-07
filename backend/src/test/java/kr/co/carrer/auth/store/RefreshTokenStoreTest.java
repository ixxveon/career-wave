package kr.co.carrer.auth.store;

import kr.co.carrer.auth.jwt.AccountType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 유휴 세션 존재성 확인 + 슬라이딩 TTL 갱신(touchSession)의 단일 TTL 판단 로직 검증.
 * 핵심: TTL(-2)=부재, 임계값 미만일 때만 EXPIRE, Redis 장애 시 fail-open(User)/보수적 거부(Admin).
 */
class RefreshTokenStoreTest {

    private static final Duration IDLE = Duration.ofMinutes(60);       // 3600s
    private static final Duration THRESHOLD = Duration.ofMinutes(50);  // 3000s

    private StringRedisTemplate redisTemplate;
    private RefreshTokenStore store;

    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        store = new RefreshTokenStore(redisTemplate);
    }

    @Test
    void touchSession_잔여TTL이_임계값보다_크면_갱신없이_true() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS))).thenReturn(3500L); // > 3000

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, THRESHOLD, false);

        assertThat(alive).isTrue();
        verify(redisTemplate, never()).expire(anyString(), any(Duration.class)); // write 미발생
    }

    @Test
    void touchSession_잔여TTL이_임계값_미만이면_EXPIRE로_갱신하고_true() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS))).thenReturn(100L); // < 3000

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, THRESHOLD, false);

        assertThat(alive).isTrue();
        verify(redisTemplate).expire(anyString(), eq(IDLE));
    }

    @Test
    void touchSession_키_부재_minus2_면_세션부재_false() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS))).thenReturn(-2L);

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, THRESHOLD, false);

        assertThat(alive).isFalse();
        verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
    }

    @Test
    void touchSession_만료없음_minus1_이면_갱신하고_true() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS))).thenReturn(-1L);

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, THRESHOLD, false);

        assertThat(alive).isTrue();
        verify(redisTemplate).expire(anyString(), eq(IDLE));
    }

    @Test
    void touchSession_Redis장애시_사용자는_fail_open_true() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS)))
                .thenThrow(new QueryTimeoutException("redis down"));

        boolean alive = store.touchSession(AccountType.USER, "sub", "sess", IDLE, THRESHOLD, false);

        assertThat(alive).isTrue(); // 가용성 우선
    }

    @Test
    void touchSession_Redis장애시_관리자는_보수적_거부_false() {
        when(redisTemplate.getExpire(anyString(), eq(TimeUnit.SECONDS)))
                .thenThrow(new QueryTimeoutException("redis down"));

        boolean alive = store.touchSession(AccountType.ADMIN, "sub", "sess", IDLE, THRESHOLD, true);

        assertThat(alive).isFalse(); // 보수적 거부
    }
}
