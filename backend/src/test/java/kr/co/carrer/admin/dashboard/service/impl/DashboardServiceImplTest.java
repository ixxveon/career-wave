package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardServiceImplTest {

    private static final String ADMIN_ROUTE_PREFIX = "/cw-manage-2026";

    @Test
    void getSummaryReturnsFrontendAdminRoutePaths() {
        DashboardSummaryQueryRepository repository = mock(DashboardSummaryQueryRepository.class);
        when(repository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(3L, 2L, 1L));
        when(repository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(4L, BigDecimal.valueOf(5000L), true, 80, true));
        when(repository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(5L, 4L, 1L, 90));
        when(repository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(6L, 1L, 1L, 4L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        1L,
                        "Audit warning",
                        "Audit warning message",
                        ZonedDateTime.parse("2026-06-22T09:00:00Z")
                )));
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        2L,
                        "Scraping failed",
                        "Scraping failed message",
                        ZonedDateTime.parse("2026-06-22T09:01:00Z")
                )));
        when(repository.findRecentActivities(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.RecentActivityRow(
                                3L,
                                ZonedDateTime.parse("2026-06-22T09:02:00Z"),
                                "admin",
                                "Checked audit log",
                                "/admin/log"
                        ),
                        new DashboardSummaryQueryRepository.RecentActivityRow(
                                4L,
                                ZonedDateTime.parse("2026-06-22T09:03:00Z"),
                                "admin",
                                "Opened dashboard",
                                "/cw-manage-2026/dashboard"
                        ),
                        new DashboardSummaryQueryRepository.RecentActivityRow(
                                5L,
                                ZonedDateTime.parse("2026-06-22T09:04:00Z"),
                                "admin",
                                "Missing target path",
                                " "
                        )
                ));

        DashboardServiceImpl service = new DashboardServiceImpl(repository);

        DashboardDTO.ResponseSummary summary = service.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(summary.kpis())
                .extracting(DashboardDTO.Kpi::targetPath)
                .containsExactly(
                        ADMIN_ROUTE_PREFIX + "/admins",
                        ADMIN_ROUTE_PREFIX + "/admins",
                        ADMIN_ROUTE_PREFIX + "/ai",
                        ADMIN_ROUTE_PREFIX + "/payments"
                );
        assertThat(summary.alerts())
                .extracting(DashboardDTO.Alert::targetPath)
                .containsExactly(
                        ADMIN_ROUTE_PREFIX + "/scraping",
                        ADMIN_ROUTE_PREFIX + "/log"
                );
        assertThat(summary.serviceCards())
                .extracting(DashboardDTO.ServiceCard::targetPath)
                .containsExactly(
                        ADMIN_ROUTE_PREFIX + "/admins",
                        ADMIN_ROUTE_PREFIX + "/ai",
                        ADMIN_ROUTE_PREFIX + "/scraping",
                        ADMIN_ROUTE_PREFIX + "/log"
                );
        assertThat(summary.recentActivities())
                .extracting(DashboardDTO.RecentActivity::targetPath)
                .containsExactly(
                        ADMIN_ROUTE_PREFIX + "/log",
                        ADMIN_ROUTE_PREFIX + "/dashboard",
                        ADMIN_ROUTE_PREFIX + "/dashboard"
                );
    }

    @Test
    void kpiContractMatchesAdminDashboardFrontendRoutes() {
        DashboardSummaryQueryRepository repository = mock(DashboardSummaryQueryRepository.class);
        when(repository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(2L, 3L, 1L));
        when(repository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(4L, BigDecimal.valueOf(10_000L), true, 0, true));
        when(repository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(0L, 0L, 0L, 0));
        when(repository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(3L, 1L, 0L, 2L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of());
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of());
        when(repository.findRecentActivities(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.RecentActivityRow(
                        30L,
                        ZonedDateTime.parse("2026-06-28T09:00:00Z"),
                        "admin",
                        "관리자 활동",
                        "/admin/log"
                )));

        DashboardServiceImpl service = new DashboardServiceImpl(repository);

        DashboardDTO.ResponseSummary result = service.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.kpis())
                .extracting(DashboardDTO.Kpi::key, DashboardDTO.Kpi::targetPath)
                .containsExactly(
                        tuple(DashboardKpiKeyType.TODAY_NEW_ADMINS, ADMIN_ROUTE_PREFIX + "/admins"),
                        tuple(DashboardKpiKeyType.REALTIME_ACTIVE_ADMINS, ADMIN_ROUTE_PREFIX + "/admins"),
                        tuple(DashboardKpiKeyType.AI_INTERVIEW_SESSIONS, ADMIN_ROUTE_PREFIX + "/ai"),
                        tuple(DashboardKpiKeyType.TODAY_REVENUE, ADMIN_ROUTE_PREFIX + "/payments")
                );
    }

    @Test
    void alertContractMatchesFrontendDomainAndRouteFilters() {
        DashboardSummaryQueryRepository repository = mock(DashboardSummaryQueryRepository.class);
        when(repository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(0L, 0L, 0L));
        when(repository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(0L, BigDecimal.ZERO, true, 0, true));
        when(repository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(0L, 0L, 0L, 0));
        when(repository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(0L, 0L, 0L, 0L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        10L,
                        "감사 로그 경고",
                        "WARN",
                        ZonedDateTime.parse("2026-06-28T09:00:00Z")
                )));
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        20L,
                        "스크래핑 실패",
                        "FAILED",
                        ZonedDateTime.parse("2026-06-28T09:01:00Z")
                )));
        when(repository.findRecentActivities(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of());

        DashboardServiceImpl service = new DashboardServiceImpl(repository);

        DashboardDTO.ResponseSummary result = service.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.alerts())
                .extracting(DashboardDTO.Alert::id, DashboardDTO.Alert::domain, DashboardDTO.Alert::level, DashboardDTO.Alert::targetPath)
                .containsExactly(
                        tuple(20L, DashboardDomainType.SCRAPING, DashboardAlertLevelType.URGENT, ADMIN_ROUTE_PREFIX + "/scraping"),
                        tuple(10L, DashboardDomainType.AUDIT_LOG, DashboardAlertLevelType.WARNING, ADMIN_ROUTE_PREFIX + "/log")
                );
    }
}
