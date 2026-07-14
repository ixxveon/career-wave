package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
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
import static org.mockito.Mockito.mock;
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
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(3L, 10L, 4L));
        lenient().when(dashboardSummaryQueryRepository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(5L, BigDecimal.valueOf(29_000L), true, 0, true));
        lenient().when(dashboardSummaryQueryRepository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(5L, 4L, 1L, 90));
        lenient().when(dashboardSummaryQueryRepository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(8L, 1L, 1L, 4L, 2L));
        lenient().when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        lenient().when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of());
        lenient().when(dashboardSummaryQueryRepository.findRecentActivities())
                .thenReturn(List.of());
    }

    @Test
    @DisplayName("스크래핑 상태 문구는 전체/성공/실행 중/실패 집계를 함께 노출한다")
    void scrapingStatusTextIncludesAllSummaryCounts() {
        when(dashboardSummaryQueryRepository.findWeeklySignups(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findPaymentRatios(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.serviceCards())
                .extracting(DashboardDTO.ServiceCard::key, DashboardDTO.ServiceCard::summaryText)
                .contains(tuple("SCRAPING", "전체 8개 / 대기 2개 / 성공 4개 / 실행 중 1개 / 실패 1개"));

        assertThat(result.systemStatus())
                .extracting(DashboardDTO.SystemStatus::key, DashboardDTO.SystemStatus::valueText)
                .contains(tuple("SCRAPING_PIPELINE", "전체 8개 / 대기 2개 / 성공 4개 / 실행 중 1개 / 실패 1개"));
    }

    @Test
    @DisplayName("회원 가입 추이, 오늘 매출, 결제 비율을 repository 집계 결과로 반환한다")
    void getSummaryUsesMemberAndPaymentMetricsFromRepository() {
        when(dashboardSummaryQueryRepository.findWeeklySignups(any(DashboardQueryWindow.class)))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.WeeklySignupRow("06/22", 2L),
                        new DashboardSummaryQueryRepository.WeeklySignupRow("06/23", 1L)
                ));
        when(dashboardSummaryQueryRepository.findPaymentRatios(any(DashboardQueryWindow.class)))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.PaymentRatioRow(DashboardPaymentMethod.CARD, "Toss Payments", 75),
                        new DashboardSummaryQueryRepository.PaymentRatioRow(DashboardPaymentMethod.OTHER, "기타 결제 수단", 25)
                ));

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.weeklySignups())
                .extracting(DashboardDTO.WeeklySignup::label, DashboardDTO.WeeklySignup::count)
                .containsExactly(
                        tuple("06/22", 2L),
                        tuple("06/23", 1L)
                );
        assertThat(result.paymentRatio())
                .extracting(DashboardDTO.PaymentRatio::method, DashboardDTO.PaymentRatio::label, DashboardDTO.PaymentRatio::ratio)
                .containsExactly(
                        tuple(DashboardPaymentMethod.CARD, "Toss Payments", 75),
                        tuple(DashboardPaymentMethod.OTHER, "기타 결제 수단", 25)
                );
        assertThat(result.kpis()).anySatisfy(kpi -> {
            assertThat(kpi.key()).isEqualTo(DashboardKpiKeyType.TODAY_REVENUE);
            assertThat(kpi.value()).isEqualTo(29_000L);
            assertThat(kpi.deltaText()).isEqualTo("오늘 결제 승인 금액 기준");
        });
    }

    @Test
    @DisplayName("결제 데이터가 없으면 결제 비율은 빈 배열로 안전하게 반환한다")
    void getSummaryAllowsEmptyPaymentRatio() {
        when(dashboardSummaryQueryRepository.findWeeklySignups(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findPaymentRatios(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.paymentRatio()).isEmpty();
    }

    @Test
    @DisplayName("알림은 level 우선순위와 생성일 역순으로 최대 5개 반환한다")
    void alertsAreSortedAndLimited() {
        ZonedDateTime now = ZonedDateTime.parse("2026-06-28T10:00:00Z");
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.AuditAlertRow(
                                1L,
                                "감사 경고",
                                "WARN",
                                DashboardAlertLevelType.WARNING,
                                now.minusMinutes(1)
                        )
                ));
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt()))
                .thenReturn(List.of(
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                2L,
                                "Scraping failed",
                                "FAILED",
                                DashboardAlertLevelType.URGENT,
                                now.minusMinutes(3)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                3L,
                                "Scraping failed",
                                "FAILED",
                                DashboardAlertLevelType.URGENT,
                                now.minusMinutes(2)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                4L,
                                "Scraping running",
                                "RUNNING",
                                DashboardAlertLevelType.URGENT,
                                now.minusMinutes(4)
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                5L,
                                "Scraping info",
                                "INFO",
                                DashboardAlertLevelType.URGENT,
                                now
                        ),
                        new DashboardSummaryQueryRepository.ScrapingAlertRow(
                                6L,
                                "Scraping warn",
                                "WARN",
                                DashboardAlertLevelType.URGENT,
                                now.minusMinutes(5)
                        )
                ));

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.alerts())
                .extracting(DashboardDTO.Alert::id, DashboardDTO.Alert::level, DashboardDTO.Alert::domain)
                .containsExactly(
                        tuple(5L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(3L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(2L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(4L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING),
                        tuple(6L, DashboardAlertLevelType.URGENT, DashboardDomainType.SCRAPING)
                );
    }

    @Test
    @DisplayName("최근 활동은 AuditLog 기반 row를 대시보드 응답으로 매핑한다")
    void recentActivitiesAreMappedFromAuditRows() {
        ZonedDateTime occurredAt = ZonedDateTime.parse("2026-06-28T10:00:00Z");
        when(dashboardSummaryQueryRepository.findRecentActivities())
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
    void recentActivitiesAreLimitedToFiveRows() {
        ZonedDateTime occurredAt = ZonedDateTime.parse("2026-06-28T10:00:00Z");
        when(dashboardSummaryQueryRepository.findRecentActivities())
                .thenReturn(java.util.stream.IntStream.rangeClosed(1, 6)
                        .mapToObj(index -> new DashboardSummaryQueryRepository.RecentActivityRow(
                                (long) index,
                                occurredAt.minusMinutes(index),
                                "admin-" + index,
                                "activity-" + index,
                                "/admin/log"
                        ))
                        .toList());

        DashboardDTO.ResponseSummary result = dashboardService.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(result.recentActivities())
                .extracting(DashboardDTO.RecentActivity::id)
                .containsExactly(1L, 2L, 3L, 4L, 5L);
    }

    @Test
    void getSummaryReturnsFrontendAdminRoutePaths() {
        when(dashboardSummaryQueryRepository.findWeeklySignups(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findPaymentRatios(any(DashboardQueryWindow.class)))
                .thenReturn(List.of());
        when(dashboardSummaryQueryRepository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        1L,
                        "Audit warning",
                        "Audit warning message",
                        DashboardAlertLevelType.WARNING,
                        ZonedDateTime.parse("2026-06-22T09:00:00Z")
                )));
        when(dashboardSummaryQueryRepository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        2L,
                        "Scraping failed",
                        "Scraping failed message",
                        DashboardAlertLevelType.URGENT,
                        ZonedDateTime.parse("2026-06-22T09:01:00Z")
                )));
        when(dashboardSummaryQueryRepository.findRecentActivities())
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
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(3L, 1L, 0L, 2L, 0L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of());
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of());
        when(repository.findRecentActivities())
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
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(0L, 0L, 0L, 0L, 0L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.AuditAlertRow(
                        10L,
                        "감사 로그 경고",
                        "WARN",
                        DashboardAlertLevelType.WARNING,
                        ZonedDateTime.parse("2026-06-28T09:00:00Z")
                )));
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), eq(5)))
                .thenReturn(List.of(new DashboardSummaryQueryRepository.ScrapingAlertRow(
                        20L,
                        "스크래핑 실패",
                        "FAILED",
                        DashboardAlertLevelType.URGENT,
                        ZonedDateTime.parse("2026-06-28T09:01:00Z")
                )));
        when(repository.findRecentActivities())
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
