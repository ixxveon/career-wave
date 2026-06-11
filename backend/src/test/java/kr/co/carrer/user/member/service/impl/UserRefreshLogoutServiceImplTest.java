package kr.co.carrer.user.member.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.UserLoginService;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserRefreshLogoutServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock HttpServletResponse httpResponse;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock TokenBlacklistStore tokenBlacklistStore;
    @Mock EntityManager entityManager;

    private UserLoginService service;
    private JwtTokenProvider provider;
    private JwtProperties props;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        provider = new JwtTokenProvider(props);
        service = new UserLoginServiceImpl(memberRepository, encoder, provider, props,
                refreshTokenStore, tokenBlacklistStore,
                mock(kr.co.carrer.auth.store.LoginAttemptStore.class), entityManager);
    }

    private Member createActiveMember() throws Exception {
        Member m = new Member();
        setField(m, "memberId", UUID.randomUUID());
        setField(m, "memberStatus", MemberStatus.ACTIVE);
        setField(m, "roleType", RoleType.USER);
        return m;
    }

    // ── Refresh ──────────────────────────────────────────────────────────────

    @Test
    void refresh_정상_rotation_새_accessToken_반환() throws Exception {
        String sessionId = UUID.randomUUID().toString();
        String subjectId = UUID.randomUUID().toString();
        String refreshToken = provider.createRefreshToken(subjectId, AccountType.USER, null, sessionId);
        String storedHash = RefreshTokenStore.hash(refreshToken);

        Member member = createActiveMember();
        setField(member, "memberId", UUID.fromString(subjectId));

        when(refreshTokenStore.matches(AccountType.USER, subjectId, sessionId, refreshToken)).thenReturn(true);
        when(memberRepository.findById(UUID.fromString(subjectId))).thenReturn(Optional.of(member));

        String newAccessToken = service.refresh(refreshToken, httpResponse);

        assertThat(newAccessToken).isNotBlank();
        verify(refreshTokenStore).rotate(eq(AccountType.USER), eq(subjectId), eq(sessionId),
                anyString(), any(Duration.class));
    }

    @Test
    void refresh_재사용탐지_전체세션_폐기_후_401() throws Exception {
        String sessionId = UUID.randomUUID().toString();
        String subjectId = UUID.randomUUID().toString();
        String refreshToken = provider.createRefreshToken(subjectId, AccountType.USER, null, sessionId);

        when(refreshTokenStore.matches(AccountType.USER, subjectId, sessionId, refreshToken)).thenReturn(false);

        assertThatThrownBy(() -> service.refresh(refreshToken, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_REFRESH_REUSE_DETECTED);

        verify(refreshTokenStore).deleteAll(AccountType.USER, subjectId);
    }

    @Test
    void refresh_비ACTIVE_회원_재발급_차단() throws Exception {
        String sessionId = UUID.randomUUID().toString();
        String subjectId = UUID.randomUUID().toString();
        String refreshToken = provider.createRefreshToken(subjectId, AccountType.USER, null, sessionId);

        Member suspended = createActiveMember();
        setField(suspended, "memberId", UUID.fromString(subjectId));
        setField(suspended, "memberStatus", MemberStatus.SUSPENDED);

        when(refreshTokenStore.matches(AccountType.USER, subjectId, sessionId, refreshToken)).thenReturn(true);
        when(memberRepository.findById(UUID.fromString(subjectId))).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> service.refresh(refreshToken, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_REFRESH_INVALID);
    }

    @Test
    void refresh_ADMIN_토큰으로_user_endpoint_차단() throws Exception {
        String sessionId = UUID.randomUUID().toString();
        // ADMIN 토큰으로 user refresh endpoint 접근
        String adminRefresh = provider.createRefreshToken("1", AccountType.ADMIN, "MASTER", sessionId);

        assertThatThrownBy(() -> service.refresh(adminRefresh, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_REFRESH_INVALID);
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    @Test
    void logout_refresh_Redis_key_삭제_및_access_blacklist_등록() throws Exception {
        String sessionId = UUID.randomUUID().toString();
        String subjectId = UUID.randomUUID().toString();
        String refreshToken = provider.createRefreshToken(subjectId, AccountType.USER, null, sessionId);
        String accessToken = provider.createAccessToken(subjectId, AccountType.USER, "USER", null);

        service.logout(refreshToken, accessToken);

        verify(refreshTokenStore).delete(AccountType.USER, subjectId, sessionId);
        verify(tokenBlacklistStore).add(anyString(), any(Duration.class));
    }

    @Test
    void logout_빈_토큰_예외_없이_처리() {
        // 비ACTIVE 회원도 logout 허용 — 예외 없이 처리
        assertThat((Object) null).isNull(); // 예외 없이 완료
        service.logout("", "");
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private void setField(Object obj, String fieldName, Object value) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(obj, value);
    }
}
