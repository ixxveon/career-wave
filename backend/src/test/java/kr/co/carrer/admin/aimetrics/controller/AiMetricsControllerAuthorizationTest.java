package kr.co.carrer.admin.aimetrics.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.carrer.admin.aimetrics.dto.AiOpsSettingDTO;
import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = AiMetricsControllerAuthorizationTest.TestConfig.class)
class AiMetricsControllerAuthorizationTest {

    @Configuration
    @EnableMethodSecurity(proxyTargetClass = true)
    static class TestConfig {

        @Bean
        AiMetricsService aiMetricsService() {
            return Mockito.mock(AiMetricsService.class);
        }

        @Bean
        AiMetricsController aiMetricsController(AiMetricsService aiMetricsService) {
            return new AiMetricsController(aiMetricsService);
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private AiMetricsController aiMetricsController;

    @org.springframework.beans.factory.annotation.Autowired
    private AiMetricsService aiMetricsService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("MASTER는 AI 사용량 요약 조회에 접근할 수 있다")
    void masterCanAccessSummary() {
        given(aiMetricsService.getSummary(null, null, null))
                .willReturn(new AiMetricsService.ResponseSummary(
                        10L,
                        3_000L,
                        1_000L,
                        new BigDecimal("1.20"),
                        6L,
                        4L,
                        0L,
                        0L,
                        3L,
                        "gpt-4o-mini"
                ));
        authenticateAs("MASTER");

        var response = aiMetricsController.getSummary(null, null, null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().totalRequests()).isEqualTo(10L);
    }

    @Test
    @DisplayName("BACKEND는 AI 사용량 요약 조회에 접근할 수 있다")
    void backendCanAccessSummary() {
        given(aiMetricsService.getSummary(null, null, null))
                .willReturn(new AiMetricsService.ResponseSummary(
                        10L,
                        3_000L,
                        1_000L,
                        new BigDecimal("1.20"),
                        6L,
                        4L,
                        0L,
                        0L,
                        3L,
                        "gpt-4o-mini"
                ));
        authenticateAs("BACKEND");

        var response = aiMetricsController.getSummary(null, null, null);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("CS는 AI 사용량 요약 조회에 접근할 수 없다")
    void csCannotAccessSummary() {
        authenticateAs("CS");

        assertThatThrownBy(() -> aiMetricsController.getSummary(null, null, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MASTER는 예산 및 임계치 수정에 접근할 수 있다")
    void masterCanUpdateBudget() {
        given(aiMetricsService.updateBudget(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("203.0.113.10")
        )).willReturn(responseBudget());
        authenticateAs("MASTER");

        var response = aiMetricsController.updateBudget(
                new AiOpsSettingDTO.RequestUpdateBudget(3L, new BigDecimal("1000000.00"), 80),
                adminPrincipal("MASTER"),
                requestWithRemoteAddr("203.0.113.10")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(aiMetricsService).updateBudget(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("203.0.113.10")
        );
    }

    @Test
    @DisplayName("BACKEND는 예산 및 임계치 수정에 접근할 수 없다")
    void backendCannotUpdateBudget() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> aiMetricsController.updateBudget(
                new AiOpsSettingDTO.RequestUpdateBudget(3L, new BigDecimal("1000000.00"), 80),
                adminPrincipal("BACKEND"),
                requestWithRemoteAddr("203.0.113.10")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("CS는 예산 및 임계치 수정에 접근할 수 없다")
    void csCannotUpdateBudget() {
        authenticateAs("CS");

        assertThatThrownBy(() -> aiMetricsController.updateBudget(
                new AiOpsSettingDTO.RequestUpdateBudget(3L, new BigDecimal("1000000.00"), 80),
                adminPrincipal("CS"),
                requestWithRemoteAddr("203.0.113.14")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("BACKEND는 Discord 알림 설정 변경에 접근할 수 있다")
    void backendCanUpdateDiscordAlert() {
        given(aiMetricsService.updateDiscordAlert(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("203.0.113.11")
        )).willReturn(responseBudget());
        authenticateAs("BACKEND");

        var response = aiMetricsController.updateDiscordAlert(
                new AiOpsSettingDTO.RequestUpdateDiscordAlert(true),
                adminPrincipal("BACKEND"),
                requestWithRemoteAddr("203.0.113.11")
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    @DisplayName("BACKEND는 rate limit 설정 변경에 접근할 수 없다")
    void backendCannotUpdateRateLimit() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> aiMetricsController.updateRateLimit(
                new AiOpsSettingDTO.RequestUpdateRateLimit(true),
                adminPrincipal("BACKEND"),
                requestWithRemoteAddr("203.0.113.12")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("CS는 rate limit 설정 변경에 접근할 수 없다")
    void csCannotUpdateRateLimit() {
        authenticateAs("CS");

        assertThatThrownBy(() -> aiMetricsController.updateRateLimit(
                new AiOpsSettingDTO.RequestUpdateRateLimit(true),
                adminPrincipal("CS"),
                requestWithRemoteAddr("203.0.113.15")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("BACKEND는 RAG 문서 삭제에 접근할 수 없다")
    void backendCannotDeleteRagDocument() {
        authenticateAs("BACKEND");

        assertThatThrownBy(() -> aiMetricsController.deleteRagDocument(
                1L,
                adminPrincipal("BACKEND"),
                requestWithRemoteAddr("203.0.113.13")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("CS는 RAG 문서 삭제에 접근할 수 없다")
    void csCannotDeleteRagDocument() {
        authenticateAs("CS");

        assertThatThrownBy(() -> aiMetricsController.deleteRagDocument(
                1L,
                adminPrincipal("CS"),
                requestWithRemoteAddr("203.0.113.16")
        )).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("미인증 요청은 AI 사용량 요약 조회에 접근할 수 없다")
    void unauthenticatedCannotAccessSummary() {
        assertThatThrownBy(() -> aiMetricsController.getSummary(null, null, null))
                .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    }

    private AiMetricsService.ResponseBudget responseBudget() {
        return new AiMetricsService.ResponseBudget(
                1L,
                3L,
                new BigDecimal("1000000.00"),
                true,
                AlertChannelType.DISCORD,
                80,
                true,
                ZonedDateTime.parse("2026-06-17T12:00:00Z")
        );
    }

    private void authenticateAs(String adminRole) {
        AuthPrincipal principal = adminPrincipal(adminRole);
        var authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private AuthPrincipal adminPrincipal(String adminRole) {
        return new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", adminRole);
    }

    private HttpServletRequest requestWithRemoteAddr(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
