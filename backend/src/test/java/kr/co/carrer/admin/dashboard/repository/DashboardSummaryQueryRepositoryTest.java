package kr.co.carrer.admin.dashboard.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSummaryQueryRepositoryTest {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final ZonedDateTime WINDOW_START = ZonedDateTime.of(
            2026, 6, 1, 0, 0, 0, 0, ZoneOffset.UTC
    );
    private static final ZonedDateTime WINDOW_END = ZonedDateTime.of(
            2026, 6, 28, 0, 0, 0, 0, ZoneOffset.UTC
    );

    private final EntityManager entityManager = mock(EntityManager.class);
    private final DashboardSummaryQueryRepository repository = new DashboardSummaryQueryRepository();
    private final DashboardQueryWindow queryWindow = new DashboardQueryWindow(
            DashboardRangeType.DAYS_30,
            WINDOW_START,
            WINDOW_END
    );

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);
    }

    @Test
    void fetchAdminAccountMetricsMapsAggregateRow() {
        Query query = singleResultQuery(3L, 4L, 2L);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        DashboardSummaryQueryRepository.AdminAccountMetrics result = repository.fetchAdminAccountMetrics(queryWindow);

        assertThat(result.newAdminCount()).isEqualTo(3L);
        assertThat(result.activeAdminCount()).isEqualTo(4L);
        assertThat(result.recentLoginCount()).isEqualTo(2L);
        verifyWindowParameters(query);
    }

    @Test
    void fetchAiUsageMetricsMapsUsageAndOpsSettings() {
        Query query = singleResultQuery(5L, new BigDecimal("1234.50"), false, 80, true);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        DashboardSummaryQueryRepository.AiUsageMetrics result = repository.fetchAiUsageMetrics(queryWindow);

        assertThat(result.interviewSessionCount()).isEqualTo(5L);
        assertThat(result.todayRevenue()).isEqualByComparingTo("1234.50");
        assertThat(result.alertEnabled()).isFalse();
        assertThat(result.alertThreshold()).isEqualTo(80);
        assertThat(result.rateLimitEnabled()).isTrue();
        verifyWindowParameters(query);
    }

    @Test
    void fetchRagDocumentMetricsMapsStatusAggregate() {
        Query query = singleResultQuery(10L, 7L, 2L, 90);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        DashboardSummaryQueryRepository.RagDocumentMetrics result = repository.fetchRagDocumentMetrics(queryWindow);

        assertThat(result.totalDocumentCount()).isEqualTo(10L);
        assertThat(result.completedDocumentCount()).isEqualTo(7L);
        assertThat(result.failedDocumentCount()).isEqualTo(2L);
        assertThat(result.highestIndexingProgress()).isEqualTo(90);
    }

    @Test
    void fetchScrapingStatusMetricsMapsPipelineAggregate() {
        Query query = singleResultQuery(4L, 1L, 2L, 1L);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        DashboardSummaryQueryRepository.ScrapingStatusMetrics result = repository.fetchScrapingStatusMetrics(queryWindow);

        assertThat(result.totalPipelineCount()).isEqualTo(4L);
        assertThat(result.runningPipelineCount()).isEqualTo(1L);
        assertThat(result.failedPipelineCount()).isEqualTo(2L);
        assertThat(result.successPipelineCount()).isEqualTo(1L);
    }

    @Test
    void findAuditAlertsMapsFailedAuditRows() {
        Timestamp createdAt = Timestamp.from(Instant.parse("2026-06-27T03:00:00Z"));
        Query query = resultListQuery(List.<Object[]>of(new Object[]{9L, "LOGIN_FAILED", "Too many failures", createdAt}));
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        List<DashboardSummaryQueryRepository.AuditAlertRow> result = repository.findAuditAlerts(queryWindow, 5);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().id()).isEqualTo(9L);
        assertThat(result.getFirst().title()).isEqualTo("LOGIN_FAILED");
        assertThat(result.getFirst().message()).isEqualTo("Too many failures");
        assertThat(result.getFirst().createdAt()).isEqualTo(createdAt.toInstant().atZone(SERVICE_ZONE_ID));
        verifyWindowParameters(query);
        verify(query).setParameter(3, 5);
    }

    @Test
    void findRecentActivitiesMapsAuditActivityRows() {
        ZonedDateTime occurredAt = ZonedDateTime.parse("2026-06-27T12:30:00Z");
        Query query = resultListQuery(List.<Object[]>of(new Object[]{
                11L,
                occurredAt,
                "admin01",
                "ADMIN_CREATED - ADMIN",
                "/admin/log"
        }));
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        List<DashboardSummaryQueryRepository.RecentActivityRow> result = repository.findRecentActivities(queryWindow, 3);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().id()).isEqualTo(11L);
        assertThat(result.getFirst().occurredAt()).isEqualTo(occurredAt);
        assertThat(result.getFirst().adminLoginId()).isEqualTo("admin01");
        assertThat(result.getFirst().message()).isEqualTo("ADMIN_CREATED - ADMIN");
        assertThat(result.getFirst().targetPath()).isEqualTo("/admin/log");
        verifyWindowParameters(query);
        verify(query).setParameter(3, 3);
    }

    @Test
    void findScrapingAlertsMapsFailedScrapingRows() {
        Instant executedAt = Instant.parse("2026-06-27T08:15:00Z");
        Query query = resultListQuery(List.<Object[]>of(new Object[]{
                15L,
                "Scraping failed: wanted",
                "Timeout",
                executedAt
        }));
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);

        List<DashboardSummaryQueryRepository.ScrapingAlertRow> result = repository.findScrapingAlerts(queryWindow, 4);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().id()).isEqualTo(15L);
        assertThat(result.getFirst().title()).isEqualTo("Scraping failed: wanted");
        assertThat(result.getFirst().message()).isEqualTo("Timeout");
        assertThat(result.getFirst().createdAt()).isEqualTo(executedAt.atZone(SERVICE_ZONE_ID));
        verifyWindowParameters(query);
        verify(query).setParameter(3, 4);
    }

    private Query singleResultQuery(Object... row) {
        Query query = mock(Query.class);
        when(query.getSingleResult()).thenReturn(row);
        return query;
    }

    private Query resultListQuery(List<Object[]> rows) {
        Query query = mock(Query.class);
        when(query.getResultList()).thenReturn(rows);
        return query;
    }

    private void verifyWindowParameters(Query query) {
        verify(query).setParameter(1, WINDOW_START);
        verify(query).setParameter(2, WINDOW_END);
    }
}
