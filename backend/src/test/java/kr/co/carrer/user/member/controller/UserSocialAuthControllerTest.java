package kr.co.carrer.user.member.controller;

import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.CookieProperties;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import kr.co.carrer.user.member.dto.UserLoginDto;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;
import kr.co.carrer.user.member.service.UserSocialAuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserSocialAuthController.class)
@Import({SecurityConfig.class, SecurityMockConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class, CookieProperties.class})
class UserSocialAuthControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean UserSocialAuthService userSocialAuthService;

    // ─── OAuth authorize ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("authorize 성공 시 200 + statusCode=200 + authorizationUrl을 반환한다")
    void authorize_성공_200() throws Exception {
        when(userSocialAuthService.authorize("kakao"))
                .thenReturn(new UserSocialAuthDto.ResponseOAuthAuthorize(
                        "kakao", "https://kauth.kakao.com/oauth/authorize?...", "state-abc"));

        mockMvc.perform(get("/api/v1/user/members/oauth/kakao/authorize"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.provider").value("kakao"))
                .andExpect(jsonPath("$.data.authorizationUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.state").isNotEmpty());
    }

    // ─── OAuth callback — 기존 소셜 계정 로그인 ───────────────────────────────────────

    @Test
    @DisplayName("callback 기존 계정 로그인 시 302 redirect — type=login 쿼리 파라미터 포함")
    void callback_기존계정_로그인_302() throws Exception {
        UUID memberId = UUID.randomUUID();
        UserLoginDto.MemberInfo memberInfo = UserLoginDto.MemberInfo.of(
                memberId, "social01", "홍길동",
                kr.co.carrer.user.member.type.RoleType.USER,
                kr.co.carrer.user.member.type.MemberStatus.ACTIVE,
                kr.co.carrer.user.member.type.SubscriptionStatus.FREE,
                kr.co.carrer.user.member.type.CompanyApprovalStatus.NONE,
                Instant.now());

        UserSocialAuthDto.ResponseOAuthCallbackLogin loginResponse =
                new UserSocialAuthDto.ResponseOAuthCallbackLogin("access-token", memberInfo, "/user/dashboard");

        when(userSocialAuthService.callback(eq("kakao"), anyString(), anyString(), any()))
                .thenReturn(loginResponse);

        mockMvc.perform(get("/api/v1/user/members/oauth/kakao/callback")
                        .param("code", "auth-code")
                        .param("state", "state-abc"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("type=login")));
    }

    // ─── OAuth callback — 최초 소셜 가입 ──────────────────────────────────────────────

    @Test
    @DisplayName("callback 최초 가입 시 302 redirect — type=signup·provider·email 쿼리 파라미터 포함")
    void callback_최초가입_302() throws Exception {
        UserSocialAuthDto.ResponseOAuthCallbackSignupRequired signupResponse =
                new UserSocialAuthDto.ResponseOAuthCallbackSignupRequired(
                        "kakao", "social@example.com", "signup-token", "/auth/register/verify");

        when(userSocialAuthService.callback(eq("kakao"), anyString(), anyString(), any()))
                .thenReturn(signupResponse);

        mockMvc.perform(get("/api/v1/user/members/oauth/kakao/callback")
                        .param("code", "auth-code")
                        .param("state", "state-abc"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("type=signup")))
                .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("provider=kakao")));
    }

    // ─── 소셜 회원가입 추가정보 완료 ────────────────────────────────────────────────────

    @Test
    @DisplayName("소셜 가입 완료 성공 시 200 + statusCode=200 + roleType=USER를 반환한다")
    void complete_성공_200() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(userSocialAuthService.complete(any(), any()))
                .thenReturn(UserSocialAuthDto.ResponseSocialComplete.of(memberId, "ACTIVE", "mock-access-token"));

        String body = """
                {"provider":"kakao","socialSignupToken":"signup-token","name":"홍길동",
                 "phone":"01012345678","phoneVerificationToken":"ptoken",
                 "terms":{"service":true,"privacy":true,"marketing":false}}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/social/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.roleType").value("USER"))
                .andExpect(jsonPath("$.data.nextPath").value("/"));
    }

    // ─── 소셜 가입 휴대폰 인증 후 분기(resolve) ─────────────────────────────────────────

    @Test
    @DisplayName("resolve LINKED 시 200 + status=LINKED + accessToken을 반환한다")
    void resolve_LINKED_200() throws Exception {
        UUID memberId = UUID.randomUUID();
        UserLoginDto.MemberInfo memberInfo = UserLoginDto.MemberInfo.of(
                memberId, "social01", "홍길동",
                kr.co.carrer.user.member.type.RoleType.USER,
                kr.co.carrer.user.member.type.MemberStatus.ACTIVE,
                kr.co.carrer.user.member.type.SubscriptionStatus.FREE,
                kr.co.carrer.user.member.type.CompanyApprovalStatus.NONE,
                Instant.now());
        when(userSocialAuthService.resolve(any(), any()))
                .thenReturn(UserSocialAuthDto.ResponseSocialResolve.linked("mock-access-token", memberInfo));

        String body = """
                {"provider":"kakao","socialSignupToken":"signup-token",
                 "phone":"01012345678","phoneVerificationToken":"ptoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/social/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.data.status").value("LINKED"))
                .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.data.nextPath").value("/"));
    }

    @Test
    @DisplayName("resolve NEW_MEMBER 시 200 + status=NEW_MEMBER + accessToken=null을 반환한다")
    void resolve_NEW_MEMBER_200() throws Exception {
        when(userSocialAuthService.resolve(any(), any()))
                .thenReturn(UserSocialAuthDto.ResponseSocialResolve.newMember());

        String body = """
                {"provider":"kakao","socialSignupToken":"signup-token",
                 "phone":"01012345678","phoneVerificationToken":"ptoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/social/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.data.status").value("NEW_MEMBER"))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("resolve 휴대폰 번호 형식 오류 시 400 검증 실패를 반환한다")
    void resolve_검증실패_400() throws Exception {
        // phone이 010 11자리 패턴에 맞지 않아 @Valid 바인딩 단계에서 실패
        String body = """
                {"provider":"kakao","socialSignupToken":"signup-token",
                 "phone":"123","phoneVerificationToken":"ptoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/social/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
