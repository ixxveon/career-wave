package kr.co.carrer.user.member.controller;

import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.user.member.dto.UserRecoveryDto;
import kr.co.carrer.user.member.service.UserRecoveryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserRecoveryController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class UserRecoveryControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean UserRecoveryService userRecoveryService;
    @MockBean JwtTokenProvider jwtTokenProvider;
    @MockBean TokenBlacklistStore tokenBlacklistStore;

    // ─── 아이디 찾기 ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("아이디 찾기 성공 시 200 + statusCode=200 + found=true + loginIds를 반환한다")
    void findId_성공_200() throws Exception {
        when(userRecoveryService.findId(any()))
                .thenReturn(new UserRecoveryDto.ResponseFindId(List.of("career01"), true));

        String body = """
                {"roleType":"USER","verificationToken":"vtoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/recovery/find-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.found").value(true))
                .andExpect(jsonPath("$.data.loginIds[0]").value("car***01"));
    }

    @Test
    @DisplayName("아이디 찾기 결과 없음 시 200 + found=false + 빈 배열을 반환한다")
    void findId_결과없음_200() throws Exception {
        when(userRecoveryService.findId(any()))
                .thenReturn(UserRecoveryDto.ResponseFindId.notFound());

        String body = """
                {"roleType":"USER","verificationToken":"vtoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/recovery/find-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.found").value(false))
                .andExpect(jsonPath("$.data.loginIds").isEmpty());
    }

    // ─── 비밀번호 재설정 권한 발급 ────────────────────────────────────────────────────

    @Test
    @DisplayName("resetToken 발급 성공 시 200 + statusCode=200 + resetToken을 반환한다")
    void issuePasswordToken_성공_200() throws Exception {
        when(userRecoveryService.issuePasswordToken(any(), anyString()))
                .thenReturn(new UserRecoveryDto.ResponsePasswordToken("raw-token", Instant.now().plusSeconds(600)));

        String body = """
                {"roleType":"USER","loginId":"career01","verificationToken":"vtoken"}
                """;

        mockMvc.perform(post("/api/v1/user/members/recovery/password-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.resetToken").value("raw-token"));
    }

    // ─── 비밀번호 재설정 ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("비밀번호 재설정 성공 시 200 + statusCode=200 + changedAt을 반환한다")
    void resetPassword_성공_200() throws Exception {
        when(userRecoveryService.resetPassword(any()))
                .thenReturn(new UserRecoveryDto.ResponseResetPassword(Instant.now()));

        String body = """
                {"resetToken":"raw-reset-token","newPassword":"NewPassword1!"}
                """;

        mockMvc.perform(post("/api/v1/user/members/recovery/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.changedAt").isNotEmpty());
    }
}
