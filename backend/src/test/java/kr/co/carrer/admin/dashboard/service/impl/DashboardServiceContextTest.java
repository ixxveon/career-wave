package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class DashboardServiceContextTest {

    @Test
    void dashboardServiceCanBeCreatedWithSummaryQueryRepositoryBean() {
        DashboardSummaryQueryRepository repository = mock(DashboardSummaryQueryRepository.class);
        DashboardServiceImpl service = new DashboardServiceImpl(repository);

        assertThat(service).isNotNull();
        assertThat(repository).isNotNull();
    }
}
