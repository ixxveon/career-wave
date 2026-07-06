package kr.co.carrer.user.member.controller;

import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import kr.co.carrer.user.member.service.UserVerificationService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserVerificationController.class)
@Import({SecurityConfig.class, SecurityMockConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class UserVerificationControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean UserVerificationService userVerificationService;

    // ─── 인증번호 발송 ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("인증번호 발송 성공 시 200 + statusCode=200 + verificationId를 반환한다")
    void send_성공_200() throws Exception {
        UUID verificationId = UUID.randomUUID();
        Instant now = Instant.now();
        when(userVerificationService.send(any()))
                .thenReturn(new UserVerificationDto.ResponseSendVerification(
                        verificationId, now.plusSeconds(300), now.plusSeconds(60), 5));

        String body = """
                {"channel":"EMAIL","target":"user@example.com","purpose":"REGISTER"}
                """;

        mockMvc.perform(post("/api/v1/user/members/verifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.verificationId").isNotEmpty())
                .andExpect(jsonPath("$.data.remainingAttempts").value(5));
    }

    @Test
    @DisplayName("필수 필드 누락 시 400을 반환한다")
    void send_필수필드_누락_400() throws Exception {
        mockMvc.perform(post("/api/v1/user/members/verifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").value("입력값 검증에 실패했습니다."))
                .andExpect(jsonPath("$.code").doesNotExist());
    }

    // ─── 인증번호 확인 ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("인증번호 확인 성공 시 200 + statusCode=200 + verificationToken을 반환한다")
    void confirm_성공_200() throws Exception {
        when(userVerificationService.confirm(any()))
                .thenReturn(new UserVerificationDto.ResponseConfirmVerification(
                        "verified-token", Instant.now()));

        String body = String.format("""
                {"verificationId":"%s","code":"123456"}
                """, UUID.randomUUID());

        mockMvc.perform(post("/api/v1/user/members/verifications/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.verificationToken").value("verified-token"));
    }

    @Test
    @DisplayName("6자리 미만 code 입력 시 400을 반환한다")
    void confirm_code_형식오류_400() throws Exception {
        String body = String.format("""
                {"verificationId":"%s","code":"123"}
                """, UUID.randomUUID());

        mockMvc.perform(post("/api/v1/user/members/verifications/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").value("입력값 검증에 실패했습니다."))
                .andExpect(jsonPath("$.code").doesNotExist());
    }
}
