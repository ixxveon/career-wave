package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardServiceContextTest {

    @Test
    void dashboardServiceCanBeCreatedWithSummaryQueryRepositoryBean() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.scan(
                    "kr.co.carrer.admin.dashboard.repository",
                    "kr.co.carrer.admin.dashboard.service.impl"
            );
            context.refresh();

            assertThat(context.getBean(DashboardServiceImpl.class)).isNotNull();
            assertThat(context.getBean(DashboardSummaryQueryRepository.class)).isNotNull();
        }
    }
}
