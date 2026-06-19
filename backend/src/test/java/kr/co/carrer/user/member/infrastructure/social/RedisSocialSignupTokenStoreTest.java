package kr.co.carrer.user.member.infrastructure.social;

import kr.co.carrer.user.member.service.SocialSignupTokenStore;
import kr.co.carrer.user.member.type.SocialProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisSocialSignupTokenStoreTest {

    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;

    private RedisSocialSignupTokenStore store;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        store = new RedisSocialSignupTokenStore(redisTemplate);
    }

    // ─── issue — TTL 10분 + raw token 값에 미포함 ──────────────────────────────────

    @Test
    void issue_TTL_10분_설정() {
        String rawToken = store.issue(SocialProvider.KAKAO, "uid-123", "user@kakao.com");

        assertThat(rawToken).isNotBlank();
        // set(key, value, TTL=10분) 호출 검증
        verify(valueOps).set(anyString(), anyString(), eq(Duration.ofMinutes(10)));
    }

    @Test
    void issue_rawToken_저장값에_미포함() {
        org.mockito.ArgumentCaptor<String> valueCaptor =
                org.mockito.ArgumentCaptor.forClass(String.class);

        String rawToken = store.issue(SocialProvider.KAKAO, "uid-456", "user@kakao.com");

        verify(valueOps).set(anyString(), valueCaptor.capture(), any(Duration.class));
        // Redis에 저장된 value는 "{provider}|{uid}|{email}" 형식 — raw token 미포함
        assertThat(valueCaptor.getValue()).doesNotContain(rawToken);
        assertThat(valueCaptor.getValue()).startsWith("KAKAO|uid-456|");
    }

    // ─── consume 정상 — payload 파싱 ───────────────────────────────────────────

    @Test
    void consume_정상_payload_반환() {
        when(valueOps.getAndDelete(anyString()))
                .thenReturn("KAKAO|provider-uid-123|user@kakao.com");

        Optional<SocialSignupTokenStore.SocialSignupPayload> result =
                store.consume("any-raw-token");

        assertThat(result).isPresent();
        assertThat(result.get().provider()).isEqualTo(SocialProvider.KAKAO);
        assertThat(result.get().providerUserId()).isEqualTo("provider-uid-123");
        assertThat(result.get().providerEmail()).isEqualTo("user@kakao.com");
    }

    @Test
    void consume_providerEmail_없음_null_반환() {
        when(valueOps.getAndDelete(anyString()))
                .thenReturn("NAVER|naver-uid-456|");

        Optional<SocialSignupTokenStore.SocialSignupPayload> result =
                store.consume("any-raw-token");

        assertThat(result).isPresent();
        assertThat(result.get().providerEmail()).isNull();
    }

    // ─── consume 실패 — 토큰 없음(만료·미존재) ─────────────────────────────────────

    @Test
    void consume_토큰_없음_empty_반환() {
        when(valueOps.getAndDelete(anyString())).thenReturn(null);

        assertThat(store.consume("invalid-token")).isEmpty();
    }

    // ─── 중복 소비 방지 — getAndDelete 원자성 검증 ─────────────────────────────────

    @Test
    void consume_중복_소비_두_번째_호출_empty() {
        // 첫 번째 호출: 값 반환 (소비됨)
        // 두 번째 호출: null 반환 (이미 삭제됨)
        when(valueOps.getAndDelete(anyString()))
                .thenReturn("GOOGLE|google-uid-789|g@gmail.com")
                .thenReturn(null);

        Optional<SocialSignupTokenStore.SocialSignupPayload> first = store.consume("same-token");
        Optional<SocialSignupTokenStore.SocialSignupPayload> second = store.consume("same-token");

        assertThat(first).isPresent();
        assertThat(second).isEmpty();
        // getAndDelete가 두 번 호출됐음을 확인 — get/delete 분리 패턴이 아님
        verify(valueOps, times(2)).getAndDelete(anyString());
        verify(valueOps, never()).get(anyString());
    }
}
