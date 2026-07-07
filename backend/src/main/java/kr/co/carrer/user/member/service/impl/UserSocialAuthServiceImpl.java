package kr.co.carrer.user.member.service.impl;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.CookieProperties;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.jwt.SessionProperties;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.service.EntitlementInitService;
import kr.co.carrer.user.member.dto.OAuthCallbackResponse;
import kr.co.carrer.user.member.dto.UserLoginDto;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberTermsAgreement;
import kr.co.carrer.user.member.entity.PersonalProfile;
import kr.co.carrer.user.member.entity.SocialAccount;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.*;
import kr.co.carrer.user.member.service.SocialSignupTokenStore;
import kr.co.carrer.user.member.service.TermsAgreementEvidenceRecorder;
import kr.co.carrer.user.member.service.UserSocialAuthService;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SocialProvider;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSocialAuthServiceImpl implements UserSocialAuthService {

    private static final String STATE_PREFIX = "oauth:state:";
    private static final Duration STATE_TTL = Duration.ofMinutes(10);

    private final UserMemberRepository memberRepository;
    private final UserMemberPersonalProfileRepository personalProfileRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final MemberTermsAgreementRepository termsRepository;
    private final MemberVerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final SessionProperties sessionProperties;
    private final RefreshTokenStore refreshTokenStore;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final SocialSignupTokenStore socialSignupTokenStore;
    private final StringRedisTemplate redisTemplate;
    private final WebClient.Builder webClientBuilder;
    private final EntitlementInitService entitlementInitService;
    private final CookieProperties cookieProperties;
    private final TermsAgreementEvidenceRecorder termsAgreementEvidenceRecorder;

    @Value("${oauth.kakao.client-id}") private String kakaoClientId;
    @Value("${oauth.kakao.client-secret}") private String kakaoClientSecret;
    @Value("${oauth.kakao.redirect-uri}") private String kakaoRedirectUri;
    @Value("${oauth.naver.client-id}") private String naverClientId;
    @Value("${oauth.naver.client-secret}") private String naverClientSecret;
    @Value("${oauth.naver.redirect-uri}") private String naverRedirectUri;
    @Value("${oauth.google.client-id}") private String googleClientId;
    @Value("${oauth.google.client-secret}") private String googleClientSecret;
    @Value("${oauth.google.redirect-uri}") private String googleRedirectUri;

    // ── authorize ──────────────────────────────────────────────────────────────

    @Override
    public UserSocialAuthDto.ResponseOAuthAuthorize authorize(String provider) {
        SocialProvider socialProvider = resolveSocialProvider(provider);
        String state = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(STATE_PREFIX + state, provider, STATE_TTL);

        String authorizationUrl = buildAuthorizationUrl(socialProvider, state);
        return new UserSocialAuthDto.ResponseOAuthAuthorize(provider, authorizationUrl, state);
    }

    private String buildAuthorizationUrl(SocialProvider provider, String state) {
        return switch (provider) {
            case KAKAO -> UriComponentsBuilder
                    .fromHttpUrl("https://kauth.kakao.com/oauth/authorize")
                    .queryParam("client_id", kakaoClientId)
                    .queryParam("redirect_uri", kakaoRedirectUri)
                    .queryParam("response_type", "code")
                    .queryParam("state", state)
                    .build().toUriString();
            case NAVER -> UriComponentsBuilder
                    .fromHttpUrl("https://nid.naver.com/oauth2.0/authorize")
                    .queryParam("client_id", naverClientId)
                    .queryParam("redirect_uri", naverRedirectUri)
                    .queryParam("response_type", "code")
                    .queryParam("state", state)
                    .build().toUriString();
            case GOOGLE -> UriComponentsBuilder
                    .fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
                    .queryParam("client_id", googleClientId)
                    .queryParam("redirect_uri", googleRedirectUri)
                    .queryParam("response_type", "code")
                    .queryParam("scope", "openid email profile")
                    .queryParam("state", state)
                    .build().toUriString();
        };
    }

    // ── callback ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OAuthCallbackResponse callback(String provider, String code, String state, HttpServletResponse response) {
        // state 원자적 소비 — getAndDelete로 중복 사용 방지
        String storedProvider = redisTemplate.opsForValue().getAndDelete(STATE_PREFIX + state);
        if (storedProvider == null || !storedProvider.equals(provider)) {
            throw new CustomException(UserAuthErrorCode.OAUTH_STATE_INVALID);
        }

        SocialProvider socialProvider = resolveSocialProvider(provider);

        OAuthUserInfo userInfo = fetchUserInfo(socialProvider, code);

        // 기존 social account 조회
        Optional<SocialAccount> existing = socialAccountRepository
                .findByProviderAndProviderUserId(socialProvider, userInfo.providerUserId());

        if (existing.isPresent()) {
            // 기존 계정 로그인
            Member member = memberRepository.findById(existing.get().getMemberId())
                    .orElseThrow(() -> new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED));

            // 계정 상태 검증 — 일반 로그인과 동일한 정책 적용
            validateAccountStatus(member);

            member.updateLastLoginAt(Instant.now());
            String accessToken = issueTokens(member, response);

            UserLoginDto.MemberInfo memberInfo = UserLoginDto.MemberInfo.of(
                    member.getMemberId(), member.getLoginId(), member.getName(),
                    member.getRoleType(), member.getMemberStatus(),
                    member.getSubscriptionStatus(),
                    kr.co.carrer.user.member.type.CompanyApprovalStatus.NONE,
                    member.getLastLoginAt());


            return new UserSocialAuthDto.ResponseOAuthCallbackLogin(
                    accessToken, memberInfo, "/");
        } else {
            // 최초 소셜 가입 — socialSignupToken 발급
            // Phase 5 callback 페이지에서 socialSignupToken을 sessionStorage에 저장 후 nextPath로 redirect
            String socialSignupToken = socialSignupTokenStore.issue(
                    socialProvider, userInfo.providerUserId(), userInfo.providerEmail());
            return new UserSocialAuthDto.ResponseOAuthCallbackSignupRequired(
                    provider, userInfo.providerEmail(), socialSignupToken, "/auth/register/verify");
        }
    }

    // ── social/complete ────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserSocialAuthDto.ResponseSocialComplete complete(
            UserSocialAuthDto.RequestSocialComplete request, HttpServletResponse response) {

        SocialProvider provider = resolveSocialProvider(request.getProvider());
        if (request.getTerms() == null
                || !request.getTerms().isService()
                || !request.getTerms().isPrivacy()) {
            throw new CustomException(UserAuthErrorCode.REGISTER_TERMS_REQUIRED);
        }

        // socialSignupToken 소비
        SocialSignupTokenStore.SocialSignupPayload payload = socialSignupTokenStore
                .consume(request.getSocialSignupToken())
                .filter(p -> p.provider() == provider)
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.SOCIAL_SIGNUP_TOKEN_INVALID));

        // 휴대폰 인증 검증 — purpose=SOCIAL_SIGNUP
        var phoneVerification = verificationRepository.findByVerificationToken(request.getPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
                phoneVerification, VerificationChannel.PHONE, request.getPhone(), VerificationPurpose.SOCIAL_SIGNUP);

        // 중복 검증
        if (memberRepository.existsByPhone(request.getPhone()))
            throw new CustomException(UserAuthErrorCode.PHONE_ALREADY_EXISTS);
        if (socialAccountRepository.existsByProviderAndProviderUserId(provider, payload.providerUserId()))
            throw new CustomException(UserAuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED);
        // 소셜 이메일 충돌 — members.email unique 제약 위반 전에 명시적 체크 (spec SOCIAL_EMAIL_ALREADY_EXISTS 409)
        if (payload.providerEmail() != null && memberRepository.existsByEmail(payload.providerEmail()))
            throw new CustomException(UserAuthErrorCode.SOCIAL_EMAIL_ALREADY_EXISTS);

        phoneVerification.markConsumed();

        // Member 생성 (소셜 회원은 loginId = UUID prefix, password = random)
        String loginId = "social_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Member member = Member.createUser(
                loginId,
                passwordEncoder.encode(UUID.randomUUID().toString()),
                request.getName(),
                payload.providerEmail(),
                request.getPhone());
        memberRepository.save(member);

        personalProfileRepository.save(PersonalProfile.emptyFor(member.getMemberId()));

        socialAccountRepository.save(SocialAccount.link(
                member.getMemberId(), provider,
                payload.providerUserId(), payload.providerEmail()));

        termsRepository.save(MemberTermsAgreement.forUser(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing()));
        termsAgreementEvidenceRecorder.recordPersonalSignup(
                member.getMemberId(),
                request.getTerms().isService(),
                request.getTerms().isPrivacy(),
                request.getTerms().isMarketing());

        // 상품별 FREE 이용권 생성 (document-coaching, interview)
        entitlementInitService.initFreeEntitlements(member.getMemberId());

        String accessToken = issueTokens(member, response);
        return UserSocialAuthDto.ResponseSocialComplete.of(
                member.getMemberId(), member.getMemberStatus().name(), accessToken);
    }

    // ── social/resolve — 휴대폰 인증 후 기존 회원 연동 / 신규 분기 ──────────────────────

    @Override
    @Transactional
    public UserSocialAuthDto.ResponseSocialResolve resolve(
            UserSocialAuthDto.RequestSocialResolve request, HttpServletResponse response) {

        SocialProvider provider = resolveSocialProvider(request.getProvider());

        // 휴대폰 인증 검증 — purpose=SOCIAL_SIGNUP (consume은 연동/가입 확정 시점에만)
        var phoneVerification = verificationRepository.findByVerificationToken(request.getPhoneVerificationToken())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(
                phoneVerification, VerificationChannel.PHONE, request.getPhone(), VerificationPurpose.SOCIAL_SIGNUP);

        // 인증한 번호의 기존 회원(탈퇴 제외) 조회
        Optional<Member> existing = memberRepository
                .findByPhoneAndRoleType(request.getPhone(), RoleType.USER)
                .filter(m -> m.getMemberStatus() != MemberStatus.WITHDRAWN);

        // 신규 번호 — 토큰 미소비, 프론트에서 이름·약관 입력 후 complete() 호출
        if (existing.isEmpty()) {
            return UserSocialAuthDto.ResponseSocialResolve.newMember();
        }

        // 기존 회원 — 소셜 계정 연동 후 로그인. socialSignupToken은 이 시점에만 소비
        Member member = existing.get();
        SocialSignupTokenStore.SocialSignupPayload payload = socialSignupTokenStore
                .consume(request.getSocialSignupToken())
                .filter(p -> p.provider() == provider)
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.SOCIAL_SIGNUP_TOKEN_INVALID));

        // 이 소셜 신원이 이미 다른 회원에 연동됨(정상 흐름이면 callback에서 로그인됐어야 함) — 방어
        if (socialAccountRepository.existsByProviderAndProviderUserId(provider, payload.providerUserId()))
            throw new CustomException(UserAuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED);
        // 이 회원이 이미 동일 provider를 연동함(다른 계정)
        if (socialAccountRepository.existsByMemberIdAndProvider(member.getMemberId(), provider))
            throw new CustomException(UserAuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED);

        // 계정 상태 검증 — 일반 로그인과 동일한 정책
        validateAccountStatus(member);

        phoneVerification.markConsumed();

        try {
            socialAccountRepository.saveAndFlush(SocialAccount.link(
                    member.getMemberId(), provider,
                    payload.providerUserId(), payload.providerEmail()));
        } catch (DataIntegrityViolationException e) {
            // 유니크 제약(provider+providerUserId / member+provider) 동시성 위반
            throw new CustomException(UserAuthErrorCode.SOCIAL_ACCOUNT_ALREADY_LINKED);
        }

        member.updateLastLoginAt(Instant.now());
        String accessToken = issueTokens(member, response);

        UserLoginDto.MemberInfo memberInfo = UserLoginDto.MemberInfo.of(
                member.getMemberId(), member.getLoginId(), member.getName(),
                member.getRoleType(), member.getMemberStatus(),
                member.getSubscriptionStatus(),
                kr.co.carrer.user.member.type.CompanyApprovalStatus.NONE,
                member.getLastLoginAt());

        return UserSocialAuthDto.ResponseSocialResolve.linked(accessToken, memberInfo);
    }

    // ── OAuth 외부 API 호출 ────────────────────────────────────────────────────

    private OAuthUserInfo fetchUserInfo(SocialProvider provider, String code) {
        return switch (provider) {
            case KAKAO -> fetchKakaoUserInfo(code);
            case NAVER -> fetchNaverUserInfo(code);
            case GOOGLE -> fetchGoogleUserInfo(code);
        };
    }

    private OAuthUserInfo fetchKakaoUserInfo(String code) {
        WebClient client = webClientBuilder.build();
        Map<?, ?> tokenResponse;
        Map<?, ?> userResponse;
        try {
            BodyInserters.FormInserter<String> kakaoForm = BodyInserters
                    .fromFormData("grant_type", "authorization_code")
                    .with("client_id", kakaoClientId)
                    .with("redirect_uri", kakaoRedirectUri)
                    .with("code", code);
            if (kakaoClientSecret != null && !kakaoClientSecret.isBlank() && !kakaoClientSecret.equals("없음")) {
                kakaoForm = kakaoForm.with("client_secret", kakaoClientSecret);
            }
            tokenResponse = client.post()
                    .uri("https://kauth.kakao.com/oauth/token")
                    .body(kakaoForm)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (tokenResponse == null || !tokenResponse.containsKey("access_token"))
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

            userResponse = client.get()
                    .uri("https://kapi.kakao.com/v2/user/me")
                    .header("Authorization", "Bearer " + tokenResponse.get("access_token"))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (CustomException e) {
            throw e;
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Kakao API 호출 실패: HTTP {}", e.getStatusCode());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (org.springframework.web.reactive.function.client.WebClientRequestException e) {
            log.error("Kakao API 호출 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (RuntimeException e) {
            if (e.getCause() instanceof java.util.concurrent.TimeoutException) {
                log.error("Kakao API timeout");
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
            }
            throw e;
        }

        if (userResponse == null) throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        // String.valueOf(null) = "null" 문자열 — null/blank/"null" 모두 fail-close
        Object idObj = userResponse.get("id");
        String providerUserId = idObj != null ? idObj.toString() : null;
        if (providerUserId == null || providerUserId.isBlank() || "null".equals(providerUserId))
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        // Kakao email nullable (spec FR-022C)
        String email = null;
        Object kakaoAccount = userResponse.get("kakao_account");
        if (kakaoAccount instanceof Map<?, ?> accountMap) {
            Object emailObj = accountMap.get("email");
            if (emailObj != null) email = String.valueOf(emailObj);
        }
        return new OAuthUserInfo(providerUserId, email);
    }

    private OAuthUserInfo fetchNaverUserInfo(String code) {
        WebClient client = webClientBuilder.build();
        Map<?, ?> tokenResponse;
        Map<?, ?> userResponse;
        try {
            tokenResponse = client.post()
                    .uri("https://nid.naver.com/oauth2.0/token")
                    .body(BodyInserters.fromFormData("grant_type", "authorization_code")
                            .with("client_id", naverClientId)
                            .with("client_secret", naverClientSecret)
                            .with("redirect_uri", naverRedirectUri)
                            .with("code", code))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (tokenResponse == null || !tokenResponse.containsKey("access_token"))
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

            userResponse = client.get()
                    .uri("https://openapi.naver.com/v1/nid/me")
                    .header("Authorization", "Bearer " + tokenResponse.get("access_token"))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (CustomException e) {
            throw e;
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Naver API 호출 실패: HTTP {}", e.getStatusCode());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (org.springframework.web.reactive.function.client.WebClientRequestException e) {
            log.error("Naver API 호출 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (RuntimeException e) {
            if (e.getCause() instanceof java.util.concurrent.TimeoutException) {
                log.error("Naver API timeout");
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
            }
            throw e;
        }

        if (userResponse == null) throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        Object responseObj = userResponse.get("response");
        if (!(responseObj instanceof Map<?, ?> profile))
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        Object idObj = profile.get("id");
        String providerUserId = idObj != null ? idObj.toString() : null;
        if (providerUserId == null || providerUserId.isBlank() || "null".equals(providerUserId))
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        Object emailObj = profile.get("email");
        String email = emailObj != null ? String.valueOf(emailObj) : null;
        return new OAuthUserInfo(providerUserId, email);
    }

    private OAuthUserInfo fetchGoogleUserInfo(String code) {
        WebClient client = webClientBuilder.build();
        Map<?, ?> tokenResponse;
        Map<?, ?> userResponse;
        try {
            tokenResponse = client.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .body(BodyInserters.fromFormData("grant_type", "authorization_code")
                            .with("client_id", googleClientId)
                            .with("client_secret", googleClientSecret)
                            .with("redirect_uri", googleRedirectUri)
                            .with("code", code))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (tokenResponse == null || !tokenResponse.containsKey("access_token"))
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

            userResponse = client.get()
                    .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                    .header("Authorization", "Bearer " + tokenResponse.get("access_token"))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (CustomException e) {
            throw e;
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Google API 호출 실패: HTTP {}", e.getStatusCode());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (org.springframework.web.reactive.function.client.WebClientRequestException e) {
            log.error("Google API 호출 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
        } catch (RuntimeException e) {
            if (e.getCause() instanceof java.util.concurrent.TimeoutException) {
                log.error("Google API timeout");
                throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);
            }
            throw e;
        }

        if (userResponse == null) throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        Object subObj = userResponse.get("sub");
        String providerUserId = subObj != null ? subObj.toString() : null;
        if (providerUserId == null || providerUserId.isBlank() || "null".equals(providerUserId))
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_AUTH_FAILED);

        Object emailObj = userResponse.get("email");
        String email = emailObj != null ? String.valueOf(emailObj) : null;
        return new OAuthUserInfo(providerUserId, email);
    }

    private record OAuthUserInfo(String providerUserId, String providerEmail) {}

    // ── 내부 유틸 ─────────────────────────────────────────────────────────────

    private SocialProvider resolveSocialProvider(String provider) {
        try {
            return SocialProvider.fromJsonValue(provider);
        } catch (IllegalArgumentException e) {
            throw new CustomException(UserAuthErrorCode.OAUTH_PROVIDER_INVALID);
        }
    }

    // 계정 상태 검증 — 일반 로그인(UserLoginServiceImpl)과 동일한 정책
    private void validateAccountStatus(Member member) {
        switch (member.getMemberStatus()) {
            case SUSPENDED    -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED       -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
            case BLACKLISTED  -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BLACKLISTED);
            case WITHDRAWN    -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
                }
                member.recoverFromLock();
            }
            default -> {}
        }
    }

    private String issueTokens(Member member, HttpServletResponse response) {
        AccountType accountType = AccountType.USER;
        String subject = member.getMemberId().toString();
        String sessionId = UUID.randomUUID().toString();

        String accessToken = jwtTokenProvider.createAccessToken(
                subject, accountType, member.getRoleType().name(), null, sessionId);
        String refreshToken = jwtTokenProvider.createRefreshToken(
                subject, accountType, null, sessionId);

        Duration accessTtl = Duration.ofMillis(jwtProperties.getUser().getAccessExpiration());
        // 쿠키 maxAge는 절대 상한(refresh 만료), Redis 세션 TTL은 유휴 타임아웃(슬라이딩)로 분리
        Duration refreshTtl = Duration.ofMillis(jwtProperties.getUser().getRefreshExpiration());
        Duration idleTtl = Duration.ofMillis(sessionProperties.getIdleTimeout());

        // session limit — 일반 로그인과 동일하게 5세션 상한 적용
        refreshTokenStore.enforceSessionLimit(accountType, subject).forEach(expiredKey -> {
            String expiredSessionId = expiredKey.substring(expiredKey.lastIndexOf(':') + 1);
            String expiredJti = refreshTokenStore.getAndDeleteAccessJti(accountType, subject, expiredSessionId);
            // 퇴출된 세션의 access token blacklist 등록 — 일반 로그인과 동일한 보안 정책
            if (expiredJti != null) tokenBlacklistStore.add(expiredJti, accessTtl);
            refreshTokenStore.delete(accountType, subject, expiredSessionId);
        });

        refreshTokenStore.save(accountType, subject, sessionId, refreshToken, idleTtl);

        // access JTI 저장 — 세션 퇴출 시 blacklist 등록에 사용
        String jti = jwtTokenProvider.extractJti(accessToken, accountType);
        refreshTokenStore.saveAccessJti(accountType, subject, sessionId, jti, accessTtl);

        response.addHeader("Set-Cookie",
                cookieProperties.refreshTokenCookie(refreshToken, refreshTtl.toSeconds()).toString());
        return accessToken;
    }
}
