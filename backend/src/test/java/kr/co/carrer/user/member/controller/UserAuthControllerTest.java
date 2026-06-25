package kr.co.carrer.user.member.controller;

import io.jsonwebtoken.Claims;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.CookieProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.user.member.service.UserLoginService;
import kr.co.carrer.user.member.service.UserMemberStatusService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserAuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class UserAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private UserLoginService userLoginService;
    @MockBean private UserMemberStatusService memberStatusService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private TokenBlacklistStore tokenBlacklistStore;
    @MockBean private IpAclPort ipAclPort;
    @MockBean private CookieProperties cookieProperties;

    // ─── refresh cookie 없음 — 401 AUTH_REFRESH_INVALID ────────────────────────────

    @Test
    @DisplayName("refresh token cookie가 없으면 controller에서 401 AUTH_REFRESH_INVALID를 반환한다")
    void refreshToken_cookie_없음_401() throws Exception {
        mockMvc.perform(post("/api/v1/user/members/token/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.code").value("AUTH_REFRESH_INVALID"));
    }

    // ─── refresh response body에 refreshToken 필드 없음 ──────────────────────────────

    @Test
    @DisplayName("token refresh 응답에 refreshToken 필드가 없고 accessToken만 반환한다")
    void refreshToken_response_body에_refreshToken_없음() throws Exception {
        when(userLoginService.refresh(anyString(), any()))
                .thenReturn("new-access-token");

        mockMvc.perform(post("/api/v1/user/members/token/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "valid-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }

    // ─── logout Set-Cookie Max-Age=0 ────────────────────────────────────────────────

    @Test
    @DisplayName("logout 성공 시 Set-Cookie 헤더에 refreshToken=; Max-Age=0이 포함된다")
    void logout_Set_Cookie_Max_Age_0() throws Exception {
        // JWT 필터 인증 mock
        Claims mockClaims = mock(Claims.class);
        when(mockClaims.get("jti", String.class)).thenReturn("jti-abc");
        when(mockClaims.getSubject()).thenReturn("user-id-123");
        when(mockClaims.get("roleType", String.class)).thenReturn("USER");
        when(mockClaims.get("adminRole", String.class)).thenReturn(null);

        when(jwtTokenProvider.extractAccountType(anyString())).thenReturn(AccountType.USER);
        when(jwtTokenProvider.validate(anyString(), any(AccountType.class))).thenReturn(true);
        when(jwtTokenProvider.parse(anyString(), any(AccountType.class))).thenReturn(mockClaims);
        when(tokenBlacklistStore.isBlacklisted(anyString(), anyBoolean())).thenReturn(false);
        doNothing().when(userLoginService).logout(anyString(), anyString());

        mockMvc.perform(post("/api/v1/user/members/logout")
                        .header("Authorization", "Bearer valid-access-token")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "valid-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(header().string("Set-Cookie", containsString("refreshToken=")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    // ─── logout response body에 data=null ────────────────────────────────────────────

    @Test
    @DisplayName("logout 응답 data는 null이다")
    void logout_response_data_null() throws Exception {
        Claims mockClaims = mock(Claims.class);
        when(mockClaims.get("jti", String.class)).thenReturn("jti-abc");
        when(mockClaims.getSubject()).thenReturn("user-id-123");
        when(mockClaims.get("roleType", String.class)).thenReturn("USER");
        when(mockClaims.get("adminRole", String.class)).thenReturn(null);

        when(jwtTokenProvider.extractAccountType(anyString())).thenReturn(AccountType.USER);
        when(jwtTokenProvider.validate(anyString(), any(AccountType.class))).thenReturn(true);
        when(jwtTokenProvider.parse(anyString(), any(AccountType.class))).thenReturn(mockClaims);
        when(tokenBlacklistStore.isBlacklisted(anyString(), anyBoolean())).thenReturn(false);
        doNothing().when(userLoginService).logout(anyString(), anyString());

        mockMvc.perform(post("/api/v1/user/members/logout")
                        .header("Authorization", "Bearer valid-access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());
    }
}
