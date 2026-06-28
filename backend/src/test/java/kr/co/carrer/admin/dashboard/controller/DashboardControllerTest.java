package kr.co.carrer.admin.dashboard.controller;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.service.DashboardService;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.admin.dashboard.type.DashboardSeverityType;
import kr.co.carrer.admin.dashboard.type.DashboardSystemStatusType;
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

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("dashboard summary serializes frontend contract keys, domains, and target paths")
    void summarySerializesFrontendContractValues() throws Exception {
        given(dashboardService.getSummary(any(DashboardDTO.RequestSummary.class)))
                .willReturn(new DashboardDTO.ResponseSummary(
                        ZonedDateTime.parse("2026-06-22T09:00:00Z"),
                        DashboardRangeType.TODAY,
                        List.of(
                                new DashboardDTO.Kpi(
                                        DashboardKpiKeyType.TODAY_NEW_ADMINS,
                                        "오늘 신규 가입자",
                                        1L,
                                        "명",
                                        "선택 기간 기준",
                                        DashboardSeverityType.NORMAL,
                                        "/cw-manage-2026/admins"
                                ),
                                new DashboardDTO.Kpi(
                                        DashboardKpiKeyType.TODAY_REVENUE,
                                        "오늘 매출",
                                        29000L,
                                        "원",
                                        "카드 결제 기준",
                                        DashboardSeverityType.NORMAL,
                                        "/cw-manage-2026/payments"
                                )
                        ),
                        List.of(
                                new DashboardDTO.Alert(
                                        1L,
                                        DashboardAlertLevelType.WARNING,
                                        DashboardDomainType.AUDIT_LOG,
                                        "감사 로그 경고",
                                        "권한 변경 경고",
                                        "/cw-manage-2026/log",
                                        ZonedDateTime.parse("2026-06-22T08:00:00Z")
                                ),
                                new DashboardDTO.Alert(
                                        2L,
                                        DashboardAlertLevelType.URGENT,
                                        DashboardDomainType.SCRAPING,
                                        "스크래핑 실패",
                                        "원티드 스크래핑 실패",
                                        "/cw-manage-2026/scraping",
                                        ZonedDateTime.parse("2026-06-22T08:10:00Z")
                                )
                        ),
                        List.of(new DashboardDTO.WeeklySignup("06/22", 3L)),
                        List.of(new DashboardDTO.PaymentRatio(DashboardPaymentMethod.CARD, "카드", 100)),
                        List.of(
                                new DashboardDTO.ServiceCard(
                                        "SCRAPING",
                                        "스크래핑 관리",
                                        "채용 공고 수집 파이프라인 상태를 확인합니다.",
                                        "실행중 1개",
                                        "/cw-manage-2026/scraping"
                                ),
                                new DashboardDTO.ServiceCard(
                                        "AUDIT_LOG",
                                        "감사 로그",
                                        "관리자 활동과 시스템 변경 이력을 확인합니다.",
                                        "알림 1건",
                                        "/cw-manage-2026/log"
                                )
                        ),
                        List.of(new DashboardDTO.SystemStatus(
                                "SCRAPING_PIPELINE",
                                "스크래핑 파이프라인",
                                DashboardSystemStatusType.WARNING,
                                "실행중 1개 / 실패 0개"
                        )),
                        List.of(new DashboardDTO.RecentActivity(
                                10L,
                                ZonedDateTime.parse("2026-06-22T08:20:00Z"),
                                "admin",
                                "관리자 활동 - 권한 변경",
                                "/cw-manage-2026/log"
                        ))
                ));

        mockMvc.perform(get("/api/v1/admin/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.kpis[0].key").value("TODAY_NEW_ADMINS"))
                .andExpect(jsonPath("$.data.kpis[0].targetPath").value("/cw-manage-2026/admins"))
                .andExpect(jsonPath("$.data.kpis[1].key").value("TODAY_REVENUE"))
                .andExpect(jsonPath("$.data.kpis[1].targetPath").value("/cw-manage-2026/payments"))
                .andExpect(jsonPath("$.data.alerts[0].domain").value("AUDIT_LOG"))
                .andExpect(jsonPath("$.data.alerts[0].targetPath").value("/cw-manage-2026/log"))
                .andExpect(jsonPath("$.data.alerts[1].domain").value("SCRAPING"))
                .andExpect(jsonPath("$.data.alerts[1].targetPath").value("/cw-manage-2026/scraping"))
                .andExpect(jsonPath("$.data.serviceCards[0].key").value("SCRAPING"))
                .andExpect(jsonPath("$.data.serviceCards[0].targetPath").value("/cw-manage-2026/scraping"))
                .andExpect(jsonPath("$.data.recentActivities[0].targetPath").value("/cw-manage-2026/log"));
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
