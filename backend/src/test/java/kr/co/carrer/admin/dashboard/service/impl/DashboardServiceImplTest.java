package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    private static final String ADMIN_ADMINS_PATH = "/cw-manage-2026/admins";
    private static final String ADMIN_AI_PATH = "/cw-manage-2026/ai";
    private static final String ADMIN_PAYMENTS_PATH = "/cw-manage-2026/payments";
    private static final String ADMIN_SCRAPING_PATH = "/cw-manage-2026/scraping";
    private static final String ADMIN_LOG_PATH = "/cw-manage-2026/log";

    @Mock
    private DashboardSummaryQueryRepository dashboardSummaryQueryRepository;

    private DashboardServiceImpl dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardServiceImpl(dashboardSummaryQueryRepository);

        when(dashboardSummaryQueryRepository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(2L, 3L, 1L));
        when(dashboardSummaryQueryRepository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(4L, BigDecimal.valueOf(10_000L), true, 0, true));
        when(dashboardSummaryQueryRepository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(0L, 0L, 0L, 0));
        when(dashboardSummaryQueryRepository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(3L, 1L, 0L, 2L));
        when(dashboardSummaryQueryRepository.findRecentActivities(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.RecentActivityRow(
                        30L,
                        ZonedDateTime.parse("2026-06-28T09:00:00Z"),
                        "admin",
                        "관리자 활동",
                        ADMIN_LOG_PATH
                )));
    }

    @Test
    @DisplayName("프론트 대시보드가 사용하는 KPI key와 targetPath 계약을 유지한다")
    void kpiContractMatchesAdminDashboardFrontendRoutes() {
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.kpis())
                .extracting(DashboardDTO.Kpi::key, DashboardDTO.Kpi::targetPath)
                .containsExactly(
                        tuple(DashboardKpiKeyType.TODAY_NEW_ADMINS, ADMIN_ADMINS_PATH),
                        tuple(DashboardKpiKeyType.REALTIME_ACTIVE_ADMINS, ADMIN_ADMINS_PATH),
                        tuple(DashboardKpiKeyType.AI_INTERVIEW_SESSIONS, ADMIN_AI_PATH),
                        tuple(DashboardKpiKeyType.TODAY_REVENUE, ADMIN_PAYMENTS_PATH)
                );
    }

    @Test
    @DisplayName("알림 domain과 targetPath는 프론트 role 필터 및 route set과 호환된다")
    void alertContractMatchesFrontendDomainAndRouteFilters() {
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        10L,
                        "감사 로그 경고",
                        "WARN",
                        DashboardAlertLevelType.WARNING,
                        ZonedDateTime.parse("2026-06-28T09:00:00Z")
                )));
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        20L,
                        "스크래핑 실패",
                        "FAILED",
                        DashboardAlertLevelType.URGENT,
                        ZonedDateTime.parse("2026-06-28T09:01:00Z")
                )));

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.alerts())
                .extracting(DashboardDTO.Alert::domain, DashboardDTO.Alert::level, DashboardDTO.Alert::targetPath)
                .containsExactly(
                        tuple(DashboardDomainType.SCRAPING, DashboardAlertLevelType.URGENT, ADMIN_SCRAPING_PATH),
                        tuple(DashboardDomainType.AUDIT_LOG, DashboardAlertLevelType.WARNING, ADMIN_LOG_PATH)
                );
    }

    @Test
    @DisplayName("서비스 카드와 최근 활동 targetPath는 프론트 관리자 라우트와 일치한다")
    void serviceCardsAndRecentActivitiesUseFrontendAdminRoutes() {
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.serviceCards())
                .extracting(DashboardDTO.ServiceCard::key, DashboardDTO.ServiceCard::targetPath)
                .containsExactly(
                        tuple("ADMIN", ADMIN_ADMINS_PATH),
                        tuple("AI_METRICS", ADMIN_AI_PATH),
                        tuple("SCRAPING", ADMIN_SCRAPING_PATH),
                        tuple("AUDIT_LOG", ADMIN_LOG_PATH)
                );
        assertThat(result.recentActivities())
                .extracting(DashboardDTO.RecentActivity::targetPath)
                .containsExactly(ADMIN_LOG_PATH);
    }
}
