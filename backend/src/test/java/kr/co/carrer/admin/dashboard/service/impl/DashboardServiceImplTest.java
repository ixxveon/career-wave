package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    private static final String ADMIN_ROUTE_PREFIX = "/cw-manage-2026";

    @Mock
    private DashboardSummaryQueryRepository dashboardSummaryQueryRepository;

    private DashboardServiceImpl dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardServiceImpl(dashboardSummaryQueryRepository);

        lenient().when(dashboardSummaryQueryRepository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(0L, 0L, 0L));
        lenient().when(dashboardSummaryQueryRepository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(0L, BigDecimal.ZERO, true, 0, true));
        when(dashboardSummaryQueryRepository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(5L, 4L, 1L, 90));
        when(dashboardSummaryQueryRepository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(6L, 1L, 1L, 4L));
        lenient().when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        lenient().when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        lenient().when(dashboardSummaryQueryRepository.findRecentActivities(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
    }

    @Test
    @DisplayName("알림은 level 우선순위와 생성일 역순으로 최대 5개 반환한다")
    void alertsAreSortedAndLimited() {
        ZonedDateTime now = ZonedDateTime.parse("2026-06-28T10:00:00Z");
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.AuditAlertRow(
                                1L,
                                DashboardAlertLevelType.WARNING,
                                "감사 경고",
                                "WARN",
                                now.minusMinutes(1)
                        )
                ));
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                2L,
                                DashboardAlertLevelType.URGENT,
                                "스크래핑 실패",
                                "FAILED",
                                now.minusMinutes(3)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                3L,
                                DashboardAlertLevelType.URGENT,
                                "스크래핑 실패",
                                "FAILED",
                                now.minusMinutes(2)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                4L,
                                DashboardAlertLevelType.WARNING,
                                "스크래핑 지연",
                                "RUNNING",
                                now.minusMinutes(4)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                5L,
                                DashboardAlertLevelType.NORMAL,
                                "스크래핑 참고",
                                "INFO",
                                now
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                6L,
                                DashboardAlertLevelType.WARNING,
                                "스크래핑 경고",
                                "WARN",
                                now.minusMinutes(5)
                        )
                ));

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.alerts())
                .extracting(DashboardDTO.Alert::id, DashboardDTO.Alert::level, DashboardDTO.Alert::domain)
                .containsExactly(
                        tuple(3L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(2L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(1L, DashboardAlertLevelType.WARNING, DashboardDomainType.AUDIT_LOG),
                        tuple(4L, DashboardAlertLevelType.WARNING, DashboardDomainType.SCRAPING),
                        tuple(6L, DashboardAlertLevelType.WARNING, DashboardDomainType.SCRAPING)
                );
    }

    @Test
    @DisplayName("최근 활동은 AuditLog 기반 row를 대시보드 응답으로 매핑한다")
    void recentActivitiesAreMappedFromAuditRows() {
        ZonedDateTime occurredAt = ZonedDateTime.parse("2026-06-28T10:00:00Z");
        when(dashboardSummaryQueryRepository.findRecentActivities(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.RecentActivityRow(
                        10L,
                        occurredAt,
                        "admin",
                        "관리자 활동 - LOGIN",
                        "/admin/log"
                )));

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.recentActivities())
                .extracting(
                        DashboardDTO.RecentActivity::id,
                        DashboardDTO.RecentActivity::occurredAt,
                        DashboardDTO.RecentActivity::adminId,
                        DashboardDTO.RecentActivity::message,
                        DashboardDTO.RecentActivity::targetPath
                )
                .containsExactly(tuple(10L, occurredAt, "admin", "관리자 활동 - LOGIN", "/cw-manage-2026/log"));
    }

    @Test
    void getSummaryReturnsFrontendAdminRoutePaths() {
        when(dashboardSummaryQueryRepository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(3L, 2L, 1L));
        when(dashboardSummaryQueryRepository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(4L, BigDecimal.valueOf(5000L), true, 80, true));
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        1L,
                        DashboardAlertLevelType.WARNING,
                        "Audit warning",
                        "Audit warning message",
                        ZonedDateTime.parse("2026-06-22T09:00:00Z")
                )));
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        2L,
                        DashboardAlertLevelType.URGENT,
                        "Scraping failed",
                        "Scraping failed message",
                        ZonedDateTime.parse("2026-06-22T09:01:00Z")
                )));
        when(dashboardSummaryQueryRepository.findRecentActivities(any(DashboardQueryWindow.class), eq(5)))
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

        DashboardDTO.ResponseSummary summary = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

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
}
