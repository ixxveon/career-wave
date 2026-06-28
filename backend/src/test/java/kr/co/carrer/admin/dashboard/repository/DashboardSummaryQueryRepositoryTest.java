package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardSummaryQueryRepositoryTest {

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
}
