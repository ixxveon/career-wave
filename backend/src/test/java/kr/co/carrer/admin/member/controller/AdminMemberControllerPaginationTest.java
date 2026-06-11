package kr.co.carrer.admin.member.controller;

import kr.co.carrer.admin.member.service.AdminMemberService;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminMemberController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
@WithMockUser(roles = "ADMIN")
class AdminMemberControllerPaginationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private AdminMemberService adminMemberService;

    @Nested
    @DisplayName("개인 회원 목록 - page/size 파라미터 검증")
    class MembersValidation {

        @Test
        @DisplayName("page=0 → 400")
        void page_0_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/members").param("page", "0").param("size", "20"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("page=-1 → 400")
        void page_negative_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/members").param("page", "-1").param("size", "20"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=0 → 400")
        void size_0_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/members").param("page", "1").param("size", "0"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=-1 → 400")
        void size_negative_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/members").param("page", "1").param("size", "-1"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=101 → 400")
        void size_over_max_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/members").param("page", "1").param("size", "101"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("기업 회원 목록 - page/size 파라미터 검증")
    class HrManagersValidation {

        @Test
        @DisplayName("page=0 → 400")
        void page_0_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/hr-managers").param("page", "0").param("size", "20"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("page=-1 → 400")
        void page_negative_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/hr-managers").param("page", "-1").param("size", "20"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=0 → 400")
        void size_0_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/hr-managers").param("page", "1").param("size", "0"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=-1 → 400")
        void size_negative_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/hr-managers").param("page", "1").param("size", "-1"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("size=101 → 400")
        void size_over_max_returns_400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/hr-managers").param("page", "1").param("size", "101"))
                    .andExpect(status().isBadRequest());
        }
    }
}
