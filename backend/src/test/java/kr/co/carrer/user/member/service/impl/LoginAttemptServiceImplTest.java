package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.user.member.repository.UserMemberStatusQueryRepository;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.LoginAttemptStore;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserLoginDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.UserLoginService;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock HttpServletResponse httpResponse;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock TokenBlacklistStore tokenBlacklistStore;
    @Mock LoginAttemptStore loginAttemptStore;
    @Mock UserMemberStatusQueryRepository statusQueryRepository;

    private UserLoginService service;
    private JwtProperties props;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private final String RAW_PASSWORD = "correct-password";

    @BeforeEach
    void setUp() {
        props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);
        service = new UserLoginServiceImpl(memberRepository, encoder, provider, props,
                refreshTokenStore, tokenBlacklistStore, loginAttemptStore, statusQueryRepository);
    }

    // ── 로그인 실패 카운트 ───────────────────────────────────────

    @Test
    void 비밀번호_틀리면_실패_카운트_증가() throws Exception {
        Member member = createActiveMember();
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        when(loginAttemptStore.increment(any(), anyString())).thenReturn(1L);
        when(loginAttemptStore.getMaxAttempts()).thenReturn(5);

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "wrong-password", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);

        verify(loginAttemptStore).increment(any(), eq("user01"));
    }

    @Test
    void 실패_5회_도달시_LOCKED_처리() throws Exception {
        Member member = createActiveMember();
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        when(loginAttemptStore.increment(any(), anyString())).thenReturn(5L);
        when(loginAttemptStore.getMaxAttempts()).thenReturn(5);

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "wrong-password", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_ACCOUNT_LOCKED);

        // lockAccount 호출 확인 — member_status = LOCKED, locked_until 설정
        assertThat(member.getMemberStatus()).isEqualTo(MemberStatus.LOCKED);
        assertThat(member.getLockedUntil()).isNotNull();
        verify(loginAttemptStore).clear(any(), eq("user01"));
    }

    @Test
    void 로그인_성공시_실패_카운트_초기화() throws Exception {
        Member member = createActiveMember();
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        lenient().when(loginAttemptStore.getMaxAttempts()).thenReturn(5);
        when(refreshTokenStore.enforceSessionLimit(any(), anyString())).thenReturn(List.of());

        UserLoginDto.Request req = new UserLoginDto.Request("user01", RAW_PASSWORD, MemberType.USER);

        service.login(req, httpResponse);

        verify(loginAttemptStore).clear(any(), eq("user01"));
    }

    @Test
    void LOCKED_자동복구_후_카운트_초기화() throws Exception {
        Member member = createLockedMember(Instant.now().minusSeconds(1)); // locked_until 경과
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        lenient().when(loginAttemptStore.getMaxAttempts()).thenReturn(5);
        when(refreshTokenStore.enforceSessionLimit(any(), anyString())).thenReturn(List.of());

        UserLoginDto.Request req = new UserLoginDto.Request("user01", RAW_PASSWORD, MemberType.USER);

        service.login(req, httpResponse);

        // 자동 복구 후 카운트 초기화 확인
        verify(loginAttemptStore, atLeastOnce()).clear(any(), eq("user01"));
        assertThat(member.getMemberStatus()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    void LOCKED_잠금_유효시_로그인_차단() throws Exception {
        Member member = createLockedMember(Instant.now().plusSeconds(600)); // 아직 잠금 중
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));

        UserLoginDto.Request req = new UserLoginDto.Request("user01", RAW_PASSWORD, MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_ACCOUNT_LOCKED);
    }

    // ── Helper ───────────────────────────────────────────────────

    private Member createActiveMember() throws Exception {
        return createMember(MemberStatus.ACTIVE, null);
    }

    private Member createLockedMember(Instant lockedUntil) throws Exception {
        return createMember(MemberStatus.LOCKED, lockedUntil);
    }

    private Member createMember(MemberStatus status, Instant lockedUntil) throws Exception {
        Member m = new Member();
        setField(m, "memberId", UUID.randomUUID());
        setField(m, "loginId", "user01");
        setField(m, "password", encoder.encode(RAW_PASSWORD));
        setField(m, "name", "홍길동");
        setField(m, "roleType", RoleType.USER);
        setField(m, "memberStatus", status);
        setField(m, "subscriptionStatus", SubscriptionStatus.FREE);
        if (lockedUntil != null) setField(m, "lockedUntil", lockedUntil);
        return m;
    }

    private void setField(Object obj, String fieldName, Object value) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(obj, value);
    }
}
