package kr.co.carrer.admin.dashboard.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSummaryQueryRepositoryTest {

    @Test
    void fetchAdminAccountMetricsUsesAdminsTable() {
        @SuppressWarnings("unchecked")
        ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider = mock(ObjectProvider.class);
        NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), any(ResultSetExtractor.class)))
                .thenReturn(new DashboardSummaryQueryRepository.AdminAccountMetrics(1L, 2L, 3L));
        DashboardSummaryQueryRepository repository = new DashboardSummaryQueryRepository(jdbcTemplateProvider);
        DashboardQueryWindow queryWindow = new DashboardQueryWindow(
                DashboardRangeType.TODAY,
                ZonedDateTime.of(2026, 6, 28, 0, 0, 0, 0, ZoneOffset.UTC),
                ZonedDateTime.of(2026, 6, 28, 15, 0, 0, 0, ZoneOffset.UTC)
        );

        repository.fetchAdminAccountMetrics(queryWindow);

        verify(jdbcTemplate).query(
                org.mockito.ArgumentMatchers.argThat(sql ->
                        sql.contains("FROM admins")
                                && sql.contains("new_admin_count")
                                && sql.contains("active_admin_count")
                                && !sql.contains("FROM members")
                ),
                any(MapSqlParameterSource.class),
                any(ResultSetExtractor.class)
        );
    }

    @Test
    void findWeeklySignupsDoesNotIncludeExclusiveEndDate() {
        @SuppressWarnings("unchecked")
        ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider = mock(ObjectProvider.class);
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(null);
        DashboardSummaryQueryRepository repository = new DashboardSummaryQueryRepository(jdbcTemplateProvider);
        DashboardQueryWindow queryWindow = new DashboardQueryWindow(
                DashboardRangeType.TODAY,
                ZonedDateTime.of(2026, 6, 28, 0, 0, 0, 0, ZoneOffset.UTC),
                ZonedDateTime.of(2026, 6, 28, 15, 0, 0, 0, ZoneOffset.UTC)
        );

        var result = repository.findWeeklySignups(queryWindow);

        assertThat(result).hasSize(7);
        assertThat(result.getLast().label()).isEqualTo("06/28");
        assertThat(result)
                .extracting(DashboardSummaryQueryRepository.WeeklySignupRow::label)
                .doesNotContain("06/29");
    }

    @Test
    void findRecentActivitiesLimitsQueryToFiveRows() {
        @SuppressWarnings("unchecked")
        ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider = mock(ObjectProvider.class);
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(null);
        EntityManager entityManager = mock(EntityManager.class);
        Query query = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getResultList()).thenReturn(java.util.List.of());
        DashboardSummaryQueryRepository repository = new DashboardSummaryQueryRepository(jdbcTemplateProvider);
        ReflectionTestUtils.setField(repository, "entityManager", entityManager);

        repository.findRecentActivities();

        verify(query).setParameter(1, 5);
    }
}
