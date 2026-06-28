package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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
                .thenReturn(List.of(new DashboardSummaryQueryRepository.RecentActivityRow(
                        3L,
                        ZonedDateTime.parse("2026-06-22T09:02:00Z"),
                        "admin",
                        "Checked audit log",
                        "/admin/log"
                )));

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
                .containsExactly(ADMIN_ROUTE_PREFIX + "/log");
    }
}
