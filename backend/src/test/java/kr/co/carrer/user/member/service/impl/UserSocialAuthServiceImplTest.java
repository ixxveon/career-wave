package kr.co.carrer.user.member.service.impl;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.SocialSignupTokenStore;
import kr.co.carrer.user.member.type.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.reactive.function.client.WebClient;

import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.user.member.entity.SocialAccount;
import reactor.core.publisher.Mono;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSocialAuthServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock UserMemberPersonalProfileRepository personalProfileRepository;
    @Mock SocialAccountRepository socialAccountRepository;
    @Mock MemberTermsAgreementRepository termsRepository;
    @Mock MemberVerificationRepository verificationRepository;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock JwtProperties jwtProperties;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock TokenBlacklistStore tokenBlacklistStore;
    @Mock SocialSignupTokenStore socialSignupTokenStore;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;
    @Mock WebClient.Builder webClientBuilder;
    @Mock HttpServletResponse httpResponse;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private UserSocialAuthServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        service = new UserSocialAuthServiceImpl(
                memberRepository, personalProfileRepository, socialAccountRepository,
                termsRepository, verificationRepository, encoder,
                jwtTokenProvider, jwtProperties, refreshTokenStore, tokenBlacklistStore,
                socialSignupTokenStore, redisTemplate, webClientBuilder);
        injectValue(service, "kakaoClientId", "kakao-id");
        injectValue(service, "kakaoClientSecret", "kakao-secret");
        injectValue(service, "kakaoRedirectUri", "http://localhost/kakao");
        injectValue(service, "naverClientId", "naver-id");
        injectValue(service, "naverClientSecret", "naver-secret");
        injectValue(service, "naverRedirectUri", "http://localhost/naver");
        injectValue(service, "googleClientId", "google-id");
        injectValue(service, "googleClientSecret", "google-secret");
        injectValue(service, "googleRedirectUri", "http://localhost/google");
    }

    // ─── SUSPENDED 계정 — validateAccountStatus() 동작 확인 ──────────────────────

    @Test
    void validateAccountStatus_SUSPENDED_AUTH_ACCOUNT_SUSPENDED() throws Exception {
        Member member = createMember(MemberStatus.SUSPENDED);

        Method m = UserSocialAuthServiceImpl.class.getDeclaredMethod("validateAccountStatus", Member.class);
        m.setAccessible(true);

        assertThatThrownBy(() -> {
            try { m.invoke(service, member); }
            catch (java.lang.reflect.InvocationTargetException e) { throw e.getCause(); }
        }).isInstanceOf(CustomException.class)
          .satisfies(e -> {
              assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
          });
    }

    @Test
    void validateAccountStatus_BANNED_AUTH_ACCOUNT_BANNED() throws Exception {
        Member member = createMember(MemberStatus.BANNED);

        Method m = UserSocialAuthServiceImpl.class.getDeclaredMethod("validateAccountStatus", Member.class);
        m.setAccessible(true);

        assertThatThrownBy(() -> {
            try { m.invoke(service, member); }
            catch (java.lang.reflect.InvocationTargetException e) { throw e.getCause(); }
        }).isInstanceOf(CustomException.class)
          .satisfies(e -> {
              assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
          });
    }

    // ─── 소셜 이메일 충돌 — SOCIAL_EMAIL_ALREADY_EXISTS ───────────────────────────

    @Test
    void complete_소셜이메일_충돌_SOCIAL_EMAIL_ALREADY_EXISTS() throws Exception {
        SocialSignupTokenStore.SocialSignupPayload payload =
                new SocialSignupTokenStore.SocialSignupPayload(
                        SocialProvider.KAKAO, "provider-user-123", "conflict@example.com");
        when(socialSignupTokenStore.consume(anyString())).thenReturn(Optional.of(payload));

        // 휴대폰 인증 mock
        kr.co.carrer.user.member.entity.MemberVerification phoneVerif =
                mock(kr.co.carrer.user.member.entity.MemberVerification.class);
        when(phoneVerif.getVerificationStatus()).thenReturn(VerificationStatus.VERIFIED);
        when(phoneVerif.getChannel()).thenReturn(VerificationChannel.PHONE);
        when(phoneVerif.getTarget()).thenReturn("01012345678");
        when(phoneVerif.getPurpose()).thenReturn(VerificationPurpose.REGISTER);
        when(phoneVerif.getExpiresAt()).thenReturn(Instant.now().plusSeconds(300));
        when(verificationRepository.findByVerificationToken(anyString()))
                .thenReturn(Optional.of(phoneVerif));

        // phone 중복 없음, social account 중복 없음, 이메일 충돌
        when(memberRepository.existsByPhone(anyString())).thenReturn(false);
        when(socialAccountRepository.existsByProviderAndProviderUserId(any(), anyString())).thenReturn(false);
        when(memberRepository.existsByEmail("conflict@example.com")).thenReturn(true);

        var request = buildRequestSocialComplete("kakao", "01012345678", "ptoken");

        assertThatThrownBy(() -> service.complete(request, httpResponse))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> {
                    assertThat(((CustomException) e).getErrorCode()).isEqualTo(UserAuthErrorCode.SOCIAL_EMAIL_ALREADY_EXISTS);
                });
    }

    // ─── socialSignupToken 소비 실패 — SOCIAL_SIGNUP_TOKEN_INVALID ───────────────────

    @Test
    void complete_socialSignupToken_소비_실패_SOCIAL_SIGNUP_TOKEN_INVALID() throws Exception {
        when(socialSignupTokenStore.consume(anyString())).thenReturn(Optional.empty());

        var request = buildRequestSocialComplete("kakao", "01012345678", "ptoken");

        assertThatThrownBy(() -> service.complete(request, httpResponse))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.SOCIAL_SIGNUP_TOKEN_INVALID));
    }

    // ─── provider 불일치 — SOCIAL_SIGNUP_TOKEN_INVALID ───────────────────────────

    @Test
    void complete_provider_불일치_SOCIAL_SIGNUP_TOKEN_INVALID() throws Exception {
        // consume()은 GOOGLE payload를 반환하지만 request provider는 kakao
        SocialSignupTokenStore.SocialSignupPayload googlePayload =
                new SocialSignupTokenStore.SocialSignupPayload(
                        SocialProvider.GOOGLE, "google-uid-123", "test@gmail.com");
        when(socialSignupTokenStore.consume(anyString())).thenReturn(Optional.of(googlePayload));

        var request = buildRequestSocialComplete("kakao", "01012345678", "ptoken");

        assertThatThrownBy(() -> service.complete(request, httpResponse))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.SOCIAL_SIGNUP_TOKEN_INVALID));
    }

    @Test
    void complete_필수약관_null_REGISTER_TERMS_REQUIRED() throws Exception {
        var request = buildRequestSocialComplete("kakao", "01012345678", "ptoken");
        setField(request, "terms", null);

        assertThatThrownBy(() -> service.complete(request, httpResponse))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.REGISTER_TERMS_REQUIRED));

        verifyNoInteractions(socialSignupTokenStore);
    }

    // ─── providerUserId null — fail-close ─────────────────────────────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void callback_providerUserId_null_OAUTH_PROVIDER_AUTH_FAILED() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.getAndDelete(anyString())).thenReturn("kakao");

        WebClient mockWebClient = mock(WebClient.class);
        when(webClientBuilder.build()).thenReturn(mockWebClient);

        WebClient.RequestBodyUriSpec postSpec = mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestHeadersSpec headersSpec = mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec responseSpec = mock(WebClient.ResponseSpec.class);
        WebClient.RequestHeadersUriSpec getSpec = mock(WebClient.RequestHeadersUriSpec.class);

        when(mockWebClient.post()).thenReturn(postSpec);
        when(postSpec.uri(anyString())).thenReturn(postSpec);
        doReturn(headersSpec).when(postSpec).body(any());
        when(headersSpec.retrieve()).thenReturn(responseSpec);
        when(mockWebClient.get()).thenReturn(getSpec);
        when(getSpec.uri(anyString())).thenReturn(headersSpec);
        when(headersSpec.header(anyString(), anyString())).thenReturn(headersSpec);

        // token 응답 → access_token 있음, user info 응답 → id 없음 (null providerUserId)
        when(responseSpec.bodyToMono(Map.class))
                .thenReturn(Mono.just(Map.of("access_token", "t")))
                .thenReturn(Mono.just(new HashMap<>()));

        assertThatThrownBy(() -> service.callback("kakao", "code-123", "state-abc", httpResponse))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED));
    }

    // ─── OAuth 로그인 — 세션 퇴출 시 기존 access token blacklist 등록 ────────────────

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void callback_세션퇴출_기존_accessToken_blacklist_등록() throws Exception {
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.getAndDelete(anyString())).thenReturn("kakao");

        WebClient mockWebClient = mock(WebClient.class);
        when(webClientBuilder.build()).thenReturn(mockWebClient);

        WebClient.RequestBodyUriSpec postSpec = mock(WebClient.RequestBodyUriSpec.class);
        WebClient.RequestHeadersSpec headersSpec = mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec responseSpec = mock(WebClient.ResponseSpec.class);
        WebClient.RequestHeadersUriSpec getSpec = mock(WebClient.RequestHeadersUriSpec.class);

        when(mockWebClient.post()).thenReturn(postSpec);
        when(postSpec.uri(anyString())).thenReturn(postSpec);
        doReturn(headersSpec).when(postSpec).body(any());
        when(headersSpec.retrieve()).thenReturn(responseSpec);
        when(mockWebClient.get()).thenReturn(getSpec);
        when(getSpec.uri(anyString())).thenReturn(headersSpec);
        when(headersSpec.header(anyString(), anyString())).thenReturn(headersSpec);
        when(responseSpec.bodyToMono(Map.class))
                .thenReturn(Mono.just(Map.of("access_token", "t")))
                .thenReturn(Mono.just(Map.of("id", "provider-uid-123")));

        // 기존 소셜 계정 존재 → 로그인 경로
        UUID memberId = UUID.randomUUID();
        SocialAccount mockAccount = mock(SocialAccount.class);
        when(mockAccount.getMemberId()).thenReturn(memberId);
        when(socialAccountRepository.findByProviderAndProviderUserId(any(), anyString()))
                .thenReturn(Optional.of(mockAccount));

        Member member = createMember(MemberStatus.ACTIVE);
        setField(member, "memberId", memberId);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        // JWT 설정
        JwtProperties.TokenConfig tokenConfig = mock(JwtProperties.TokenConfig.class);
        when(tokenConfig.getAccessExpiration()).thenReturn(1800000L);
        when(tokenConfig.getRefreshExpiration()).thenReturn(604800000L);
        when(jwtProperties.getUser()).thenReturn(tokenConfig);
        when(jwtTokenProvider.createAccessToken(anyString(), any(), anyString(), any()))
                .thenReturn("new-access-token");
        when(jwtTokenProvider.createRefreshToken(anyString(), any(), any(), anyString()))
                .thenReturn("new-refresh-token");
        when(jwtTokenProvider.extractJti(anyString(), any())).thenReturn("new-jti");

        // 세션 퇴출 — 만료된 세션 1개 반환
        String expiredKey = "refresh:USER:" + memberId + ":old-session-id";
        when(refreshTokenStore.enforceSessionLimit(any(), anyString()))
                .thenReturn(List.of(expiredKey));
        when(refreshTokenStore.getAndDeleteAccessJti(any(), anyString(), eq("old-session-id")))
                .thenReturn("expired-jti");

        service.callback("kakao", "auth-code", "state-xyz", httpResponse);

        // 퇴출된 세션의 JTI가 blacklist에 등록되어야 함
        verify(tokenBlacklistStore).add(eq("expired-jti"), any(Duration.class));
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private Member createMember(MemberStatus status) throws Exception {
        Member m = new Member() {};
        setField(m, "memberId", UUID.randomUUID());
        setField(m, "loginId", "testlogin");
        setField(m, "name", "홍길동");
        setField(m, "email", "test@example.com");
        setField(m, "roleType", RoleType.USER);
        setField(m, "memberStatus", status);
        setField(m, "subscriptionStatus", SubscriptionStatus.FREE);
        return m;
    }

    private kr.co.carrer.user.member.dto.UserSocialAuthDto.RequestSocialComplete buildRequestSocialComplete(
            String provider, String phone, String phoneToken) throws Exception {
        var req = new kr.co.carrer.user.member.dto.UserSocialAuthDto.RequestSocialComplete();
        setField(req, "provider", provider);
        setField(req, "socialSignupToken", "signup-token");
        setField(req, "name", "홍길동");
        setField(req, "carrier", "SKT");
        setField(req, "phone", phone);
        setField(req, "phoneVerificationToken", phoneToken);
        var terms = new kr.co.carrer.user.member.dto.UserRegisterDto.PersonalTerms();
        setField(terms, "service", true);
        setField(terms, "privacy", true);
        setField(terms, "marketing", false);
        setField(req, "terms", terms);
        return req;
    }

    private void injectValue(Object target, String name, Object value) throws Exception {
        setField(target, name, value);
    }

    private void setField(Object target, String name, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }
}
