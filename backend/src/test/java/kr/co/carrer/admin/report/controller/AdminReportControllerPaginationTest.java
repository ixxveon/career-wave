package kr.co.carrer.admin.report.controller;

import kr.co.carrer.admin.report.service.AdminReportService;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminReportController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class, SecurityMockConfig.class})
class AdminReportControllerPaginationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean private AdminReportService adminReportService;
    @MockBean private AccountStatusPort accountStatusPort;

    private AuthPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        adminPrincipal = new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", "CS");
        given(accountStatusPort.supports(AccountType.ADMIN)).willReturn(true);
        willDoNothing().given(accountStatusPort).validateActive(anyString());
    }

    @Test
    @DisplayName("page=0 → 400")
    void page_zero_returns_400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                .param("page", "0").param("size", "20")
                .with(user(adminPrincipal)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("page=-1 → 400")
    void page_negative_returns_400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                .param("page", "-1").param("size", "20")
                .with(user(adminPrincipal)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("size=0 → 400")
    void size_zero_returns_400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                .param("page", "1").param("size", "0")
                .with(user(adminPrincipal)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("size=-1 → 400")
    void size_negative_returns_400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                .param("page", "1").param("size", "-1")
                .with(user(adminPrincipal)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("size=101 → 400")
    void size_over_max_returns_400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reports")
                .param("page", "1").param("size", "101")
                .with(user(adminPrincipal)))
            .andExpect(status().isBadRequest());
    }
}
