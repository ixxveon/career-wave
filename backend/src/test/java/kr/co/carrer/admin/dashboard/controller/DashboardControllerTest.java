package kr.co.carrer.admin.dashboard.controller;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.service.DashboardService;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.admin.dashboard.type.DashboardSeverityType;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private IpAclPort ipAclPort;

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("GET /api/v1/admin/dashboard/summary returns dashboard summary")
    void getSummaryReturnsDashboardSummary() throws Exception {
        given(dashboardService.getSummary(any(DashboardDTO.RequestSummary.class)))
                .willReturn(new DashboardDTO.ResponseSummary(
                        ZonedDateTime.parse("2026-06-22T09:00:00Z"),
                        DashboardRangeType.TODAY,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of()
                ));

        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.baseDateTime").value("2026-06-22T09:00:00Z"))
                .andExpect(jsonPath("$.data.range").value("TODAY"))
                .andExpect(jsonPath("$.data.kpis").isArray())
                .andExpect(jsonPath("$.data.alerts").isArray())
                .andExpect(jsonPath("$.data.weeklySignups").isArray())
                .andExpect(jsonPath("$.data.paymentRatio").isArray())
                .andExpect(jsonPath("$.data.serviceCards").isArray())
                .andExpect(jsonPath("$.data.systemStatus").isArray())
                .andExpect(jsonPath("$.data.recentActivities").isArray());
    }

    @ParameterizedTest
    @CsvSource({
            "TODAY,TODAY",
            "7D,DAYS_7",
            "30D,DAYS_30"
    })
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("range query parameter accepts TODAY, 7D, and 30D")
    void allowedRangeValuesReturnDashboardSummary(String requestRange, DashboardRangeType expectedRange) throws Exception {
        given(dashboardService.getSummary(any(DashboardDTO.RequestSummary.class)))
                .willReturn(new DashboardDTO.ResponseSummary(
                        ZonedDateTime.parse("2026-06-22T09:00:00Z"),
                        expectedRange,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of()
                ));

        mockMvc.perform(get("/api/v1/admin/dashboard/summary").param("range", requestRange))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.range").value(requestRange));

        verify(dashboardService).getSummary(new DashboardDTO.RequestSummary(expectedRange));
    }

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("invalid range query parameter returns BAD_REQUEST")
    void invalidRangeReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary").param("range", "YESTERDAY"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));

        verify(dashboardService, never()).getSummary(any(DashboardDTO.RequestSummary.class));
    }

    @Test
    @DisplayName("unauthenticated request returns UNAUTHORIZED")
    void unauthenticatedRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());

        verify(dashboardService, never()).getSummary(any(DashboardDTO.RequestSummary.class));
    }

    @Test
    @DisplayName("admin without allowed detail role returns FORBIDDEN")
    void adminWithoutAllowedDetailRoleReturnsForbidden() throws Exception {
        mockMvc.perform(
                        get("/api/v1/admin/dashboard/summary")
                                .with(user("admin").roles("ADMIN"))
                )
                .andExpect(status().isForbidden());

        verify(dashboardService, never()).getSummary(any(DashboardDTO.RequestSummary.class));
    }

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("empty dashboard sections are returned as arrays")
    void emptySectionsReturnArrayStructures() throws Exception {
        given(dashboardService.getSummary(any(DashboardDTO.RequestSummary.class)))
                .willReturn(new DashboardDTO.ResponseSummary(
                        ZonedDateTime.parse("2026-06-22T09:00:00Z"),
                        DashboardRangeType.TODAY,
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of()
                ));

        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kpis").isArray())
                .andExpect(jsonPath("$.data.kpis").isEmpty())
                .andExpect(jsonPath("$.data.alerts").isArray())
                .andExpect(jsonPath("$.data.alerts").isEmpty())
                .andExpect(jsonPath("$.data.weeklySignups").isArray())
                .andExpect(jsonPath("$.data.weeklySignups").isEmpty())
                .andExpect(jsonPath("$.data.paymentRatio").isArray())
                .andExpect(jsonPath("$.data.paymentRatio").isEmpty())
                .andExpect(jsonPath("$.data.serviceCards").isArray())
                .andExpect(jsonPath("$.data.serviceCards").isEmpty())
                .andExpect(jsonPath("$.data.systemStatus").isArray())
                .andExpect(jsonPath("$.data.systemStatus").isEmpty())
                .andExpect(jsonPath("$.data.recentActivities").isArray())
                .andExpect(jsonPath("$.data.recentActivities").isEmpty());
    }

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("dashboard summary contains all four KPI keys")
    void summaryContainsAllKpiKeys() throws Exception {
        given(dashboardService.getSummary(any(DashboardDTO.RequestSummary.class)))
                .willReturn(new DashboardDTO.ResponseSummary(
                        ZonedDateTime.parse("2026-06-22T09:00:00Z"),
                        DashboardRangeType.TODAY,
                        List.of(
                                createKpi(DashboardKpiKeyType.TODAY_NEW_ADMINS),
                                createKpi(DashboardKpiKeyType.REALTIME_ACTIVE_ADMINS),
                                createKpi(DashboardKpiKeyType.AI_INTERVIEW_SESSIONS),
                                createKpi(DashboardKpiKeyType.TODAY_REVENUE)
                        ),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of()
                ));

        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kpis.length()").value(4))
                .andExpect(jsonPath("$.data.kpis[?(@.key == 'TODAY_NEW_ADMINS')]").exists())
                .andExpect(jsonPath("$.data.kpis[?(@.key == 'REALTIME_ACTIVE_ADMINS')]").exists())
                .andExpect(jsonPath("$.data.kpis[?(@.key == 'AI_INTERVIEW_SESSIONS')]").exists())
                .andExpect(jsonPath("$.data.kpis[?(@.key == 'TODAY_REVENUE')]").exists());
    }

    private DashboardDTO.Kpi createKpi(DashboardKpiKeyType key) {
        return new DashboardDTO.Kpi(
                key,
                key.name(),
                1L,
                "count",
                "test",
                DashboardSeverityType.NORMAL,
                "/admin/dashboard"
        );
    }
}
