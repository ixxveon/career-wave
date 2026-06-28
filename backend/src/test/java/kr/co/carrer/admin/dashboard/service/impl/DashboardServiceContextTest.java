package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardServiceContextTest {

    @Test
    void dashboardServiceCanBeCreatedWithSummaryQueryRepositoryBean() {
        DashboardSummaryQueryRepository repository = mock(DashboardSummaryQueryRepository.class);
        when(repository.fetchAdminAccountMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(2L, 3L, 1L));
        when(repository.fetchAiUsageMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AiUsageMetrics(4L, BigDecimal.valueOf(1000L), true, 0, true));
        when(repository.fetchRagDocumentMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.RagDocumentMetrics(0L, 0L, 0L, 0));
        when(repository.fetchScrapingStatusMetrics(any(DashboardQueryWindow.class)))
                .thenReturn(new DashboardSummaryQueryRepository.ScrapingStatusMetrics(0L, 0L, 0L, 0L));
        when(repository.findAuditAlerts(any(DashboardQueryWindow.class), anyInt())).thenReturn(List.of());
        when(repository.findScrapingAlerts(any(DashboardQueryWindow.class), anyInt())).thenReturn(List.of());
        when(repository.findRecentActivities(any(DashboardQueryWindow.class), anyInt())).thenReturn(List.of());
        DashboardServiceImpl service = new DashboardServiceImpl(repository);

        DashboardDTO.ResponseSummary summary = service.getSummary(new DashboardDTO.RequestSummary(DashboardRangeType.TODAY));

        assertThat(summary.kpis())
                .anySatisfy(kpi -> {
                    assertThat(kpi.key()).isEqualTo(DashboardKpiKeyType.TODAY_REVENUE);
                    assertThat(kpi.value()).isEqualTo(1000L);
                });
        verify(repository).fetchAdminAccountMetrics(any(DashboardQueryWindow.class));
    }
}
