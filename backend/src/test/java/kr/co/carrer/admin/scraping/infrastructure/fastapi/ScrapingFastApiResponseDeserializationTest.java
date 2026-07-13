package kr.co.carrer.admin.scraping.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ScrapingFastApiResponseDeserializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("snake_case 파이프라인 페이지 응답도 Spring DTO로 역직렬화한다")
    void deserializesSnakeCasePipelinePage() throws Exception {
        ScrapingFastApiResponse.PipelinePage response = objectMapper.readValue(
                """
                        {
                          "content": [
                            {
                              "scraping_pipeline_id": 1,
                              "source_name": "wanted",
                              "display_name": "Wanted",
                              "pipeline_status": "SUCCESS",
                              "is_enabled": true,
                              "schedule_interval_minutes": 360,
                              "last_started_at": "2026-06-26T00:00:00Z",
                              "last_success_at": "2026-06-26T00:01:00Z",
                              "last_failed_at": null,
                              "last_duration_ms": 60000,
                              "last_total_count": 12,
                              "last_error_message": null,
                              "created_at": "2026-06-01T00:00:00Z",
                              "updated_at": "2026-06-26T00:01:00Z"
                            }
                          ],
                          "page": 1,
                          "size": 20,
                          "total_elements": 1,
                          "total_pages": 1
                        }
                        """,
                ScrapingFastApiResponse.PipelinePage.class
        );

        assertThat(response.totalElements()).isEqualTo(1L);
        assertThat(response.totalPages()).isEqualTo(1);
        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().scrapingPipelineId()).isEqualTo(1L);
        assertThat(response.content().getFirst().sourceName()).isEqualTo("wanted");
        assertThat(response.content().getFirst().isEnabled()).isTrue();
        assertThat(response.content().getFirst().scheduleIntervalMinutes()).isEqualTo(360);
    }

    @Test
    @DisplayName("snake_case 요약 응답도 Spring DTO로 역직렬화한다")
    void deserializesSnakeCaseSummary() throws Exception {
        ScrapingFastApiResponse.Summary response = objectMapper.readValue(
                """
                        {
                          "total_count": 4,
                          "idle_count": 1,
                          "running_count": 1,
                          "success_count": 1,
                          "failed_count": 1,
                          "enabled_count": 3,
                          "disabled_count": 1
                        }
                        """,
                ScrapingFastApiResponse.Summary.class
        );

        assertThat(response.totalCount()).isEqualTo(4L);
        assertThat(response.idleCount()).isEqualTo(1L);
        assertThat(response.disabledCount()).isEqualTo(1L);
    }
}
