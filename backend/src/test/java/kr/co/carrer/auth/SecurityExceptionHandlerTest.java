package kr.co.carrer.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import kr.co.carrer.admin.member.controller.AdminMemberController;
import kr.co.carrer.admin.member.service.AdminMemberService;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.admin.auth.filter.AdminAccountStatusPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import kr.co.carrer.user.member.filter.UserAccountStatusPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminMemberController.class)
@Import({SecurityConfig.class, SecurityMockConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class SecurityExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    // SecurityMockConfig 가 제공하는 공통 mock — 스텁이 필요해 @Autowired 로 주입받는다.
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private AdminMemberService adminMemberService;

    @MockBean
    private AdminAccountStatusPort adminAccountStatusPort;

    @MockBean
    private UserAccountStatusPort userAccountStatusPort;

    // @TestConfiguration 의 @Bean mock 은 @MockBean 과 달리 테스트 간 자동 리셋되지 않으므로
    // 스텁이 누수되지 않도록 각 테스트 전에 초기화한다.
    @BeforeEach
    void resetCommonMocks() {
        reset(jwtTokenProvider, tokenBlacklistStore);
    }

    @Test
    void 토큰_없음_401_ApiResponse_반환() throws Exception {
        mockMvc.perform(get("/api/v1/admin/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증 정보가 없습니다."))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void 위조_bearer_token_401_ApiResponse_반환() throws Exception {
        when(jwtTokenProvider.extractAccountType("fake.invalid.token"))
                .thenThrow(new JwtException("Malformed JWT"));

        mockMvc.perform(get("/api/v1/admin/members")
                        .header("Authorization", "Bearer fake.invalid.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증 정보가 없습니다."))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void 만료_token_401_ApiResponse_반환() throws Exception {
        when(jwtTokenProvider.extractAccountType("expired.token"))
                .thenReturn(AccountType.USER);
        when(jwtTokenProvider.validate("expired.token", AccountType.USER))
                .thenThrow(new JwtException("JWT expired"));

        mockMvc.perform(get("/api/v1/admin/members")
                        .header("Authorization", "Bearer expired.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("인증 정보가 없습니다."))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void USER_token으로_admin_API_접근시_403_ApiResponse_반환() throws Exception {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("uuid-1234");
        when(claims.get("roleType", String.class)).thenReturn("USER");
        when(claims.get("adminRole", String.class)).thenReturn(null);
        // jti가 없으면 fail-closed(401)로 빠지므로 유효한 jti를 설정한다.
        when(claims.get("jti", String.class)).thenReturn("test-jti-user");

        when(jwtTokenProvider.extractAccountType(anyString())).thenReturn(AccountType.USER);
        when(jwtTokenProvider.validate(anyString(), any(AccountType.class))).thenReturn(true);
        when(jwtTokenProvider.parse(anyString(), any(AccountType.class))).thenReturn(claims);
        when(tokenBlacklistStore.isBlacklisted(eq("test-jti-user"), anyBoolean())).thenReturn(false);
        // orElseThrow 미발생을 위해 UserAccountStatusPort가 USER를 supports하도록 stub.
        // validateActive()는 mock 기본값(no-op) → Spring Security hasRole("ADMIN")이 403 처리.
        when(userAccountStatusPort.supports(AccountType.USER)).thenReturn(true);

        mockMvc.perform(get("/api/v1/admin/members")
                        .header("Authorization", "Bearer user.access.token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("접근 권한이 없습니다."))
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }
}
