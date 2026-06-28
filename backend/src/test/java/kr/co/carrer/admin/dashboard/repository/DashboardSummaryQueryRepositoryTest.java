package kr.co.carrer.admin.dashboard.repository;

import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSummaryQueryRepositoryTest {

    private final NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
    private DashboardSummaryQueryRepository repository;
    private DashboardQueryWindow queryWindow;

    @BeforeEach
    void setUp() {
        @SuppressWarnings("unchecked")
        ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider = mock(ObjectProvider.class);
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(jdbcTemplate);
        repository = new DashboardSummaryQueryRepository(jdbcTemplateProvider);
        queryWindow = new DashboardQueryWindow(
                DashboardRangeType.TODAY,
                ZonedDateTime.of(2026, 6, 28, 0, 0, 0, 0, ZoneOffset.UTC),
                ZonedDateTime.of(2026, 6, 28, 12, 0, 0, 0, ZoneOffset.UTC)
        );
    }

    @Test
    void findAuditAlertsHandlesNullLogType() throws Exception {
        ArgumentCaptor<RowMapper<DashboardSummaryQueryRepository.AuditAlertRow>> mapperCaptor =
                rowMapperCaptor();
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), mapperCaptor.capture()))
                .thenReturn(List.of());

        repository.findAuditAlerts(queryWindow, 5);

        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getString("severity")).thenReturn("ERROR");
        when(resultSet.getString("log_type")).thenReturn(null);
        when(resultSet.getString("action")).thenReturn("LOGIN_FAILED");
        when(resultSet.getString("target_type")).thenReturn(null);
        when(resultSet.getString("target_id")).thenReturn(null);
        when(resultSet.getString("detail")).thenReturn(null);
        when(resultSet.getLong("audit_log_id")).thenReturn(1L);
        when(resultSet.getObject("created_at")).thenReturn(Timestamp.from(queryWindow.rangeStartInclusive().toInstant()));

        var mapped = mapperCaptor.getValue().mapRow(resultSet, 0);

        assertThat(mapped.title()).isEqualTo("관리자 활동 오류 감지");
        assertThat(mapped.message()).contains("LOGIN_FAILED");
    }

    @Test
    void findRecentActivitiesHandlesNullLogType() throws Exception {
        ArgumentCaptor<RowMapper<DashboardSummaryQueryRepository.RecentActivityRow>> mapperCaptor =
                rowMapperCaptor();
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), mapperCaptor.capture()))
                .thenReturn(List.of());

        repository.findRecentActivities(queryWindow, 5);

        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getLong("audit_log_id")).thenReturn(1L);
        when(resultSet.getObject("created_at")).thenReturn(Timestamp.from(queryWindow.rangeStartInclusive().toInstant()));
        when(resultSet.getString("admin_login_id")).thenReturn("admin");
        when(resultSet.getString("log_type")).thenReturn(null);
        when(resultSet.getString("action")).thenReturn("LOGIN");
        when(resultSet.getString("target_type")).thenReturn(null);
        when(resultSet.getString("target_id")).thenReturn(null);
        when(resultSet.getString("detail")).thenReturn(null);

        var mapped = mapperCaptor.getValue().mapRow(resultSet, 0);

        assertThat(mapped.message()).contains("관리자 활동 - ").contains("LOGIN");
    }

    @SuppressWarnings("unchecked")
    private static <T> ArgumentCaptor<RowMapper<T>> rowMapperCaptor() {
        return ArgumentCaptor.forClass(RowMapper.class);
    }
}
