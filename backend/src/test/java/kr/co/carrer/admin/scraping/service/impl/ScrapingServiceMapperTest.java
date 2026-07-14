package kr.co.carrer.admin.scraping.service.impl;

import kr.co.carrer.admin.scraping.service.ScrapingFastApiGateway;
import kr.co.carrer.admin.scraping.service.ScrapingService;
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ScrapingServiceMapperTest {

    @Test
    @DisplayName("FastAPI 파이프라인 목록 응답을 서비스 페이지 응답으로 매핑한다")
    void mapsPipelinePageResponse() {
        ZonedDateTime startedAt = ZonedDateTime.parse("2026-06-21T10:00:00Z");
        ZonedDateTime successAt = ZonedDateTime.parse("2026-06-21T10:01:10Z");
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-01T00:00:00Z");
        ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-21T10:01:10Z");

        ScrapingService.ResponsePipelinePage result = ScrapingServiceMapper.toPipelinePage(
                new ScrapingFastApiGateway.PipelinePageResponse(
                        List.of(new ScrapingFastApiGateway.PipelineItemResponse(
                                1L,
                                "wanted",
                                "Wanted",
                                ScrapingPipelineStatusType.SUCCESS,
                                true,
                                360,
                                startedAt,
                                successAt,
                                null,
                                70_000,
                                132,
                                null,
                                createdAt,
                                updatedAt
                        )),
                        1,
                        20,
                        1L,
                        1
                )
        );

        assertThat(result.page()).isEqualTo(1);
        assertThat(result.size()).isEqualTo(20);
        assertThat(result.totalElements()).isEqualTo(1L);
        assertThat(result.totalPages()).isEqualTo(1);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().getFirst().scrapingPipelineId()).isEqualTo(1L);
        assertThat(result.content().getFirst().sourceName()).isEqualTo("wanted");
        assertThat(result.content().getFirst().pipelineStatus()).isEqualTo(ScrapingPipelineStatusType.SUCCESS);
        assertThat(result.content().getFirst().scheduleIntervalMinutes()).isEqualTo(360);
        assertThat(result.content().getFirst().lastStartedAt()).isEqualTo(startedAt);
        assertThat(result.content().getFirst().lastSuccessAt()).isEqualTo(successAt);
    }

    @Test
    @DisplayName("FastAPI 파이프라인 요약 응답을 서비스 요약 응답으로 매핑한다")
    void mapsSummaryResponse() {
        ScrapingService.ResponseSummary result = ScrapingServiceMapper.toSummary(
                new ScrapingFastApiGateway.SummaryResponse(
                        4L,
                        1L,
                        1L,
                        1L,
                        1L,
                        4L,
                        0L
                )
        );

        assertThat(result.totalCount()).isEqualTo(4L);
        assertThat(result.idleCount()).isEqualTo(1L);
        assertThat(result.runningCount()).isEqualTo(1L);
        assertThat(result.successCount()).isEqualTo(1L);
        assertThat(result.failedCount()).isEqualTo(1L);
        assertThat(result.enabledCount()).isEqualTo(4L);
        assertThat(result.disabledCount()).isEqualTo(0L);
    }

    @Test
    @DisplayName("FastAPI 파이프라인 상세 응답을 서비스 상세 응답으로 매핑한다")
    void mapsDetailResponse() {
        ZonedDateTime failedAt = ZonedDateTime.parse("2026-06-21T10:05:00Z");
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-01T00:00:00Z");
        ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-21T10:05:10Z");

        ScrapingService.ResponseDetail result = ScrapingServiceMapper.toDetail(
                new ScrapingFastApiGateway.DetailResponse(
                        2L,
                        "saramin",
                        "Saramin",
                        ScrapingPipelineStatusType.FAILED,
                        true,
                        360,
                        null,
                        null,
                        failedAt,
                        null,
                        null,
                        "timeout",
                        createdAt,
                        updatedAt
                )
        );

        assertThat(result.scrapingPipelineId()).isEqualTo(2L);
        assertThat(result.sourceName()).isEqualTo("saramin");
        assertThat(result.pipelineStatus()).isEqualTo(ScrapingPipelineStatusType.FAILED);
        assertThat(result.scheduleIntervalMinutes()).isEqualTo(360);
        assertThat(result.lastFailedAt()).isEqualTo(failedAt);
        assertThat(result.lastErrorMessage()).isEqualTo("timeout");
        assertThat(result.createdAt()).isEqualTo(createdAt);
        assertThat(result.updatedAt()).isEqualTo(updatedAt);
    }

    @Test
    @DisplayName("FastAPI 실행 로그 응답을 서비스 로그 페이지 응답으로 매핑한다")
    void mapsLogPageResponse() {
        ZonedDateTime occurredAt = ZonedDateTime.parse("2026-06-21T11:00:00Z");

        ScrapingService.ResponseLogPage result = ScrapingServiceMapper.toLogPage(
                new ScrapingFastApiGateway.LogPageResponse(
                        List.of(new ScrapingFastApiGateway.LogItemResponse(
                                10L,
                                occurredAt,
                                "wanted",
                                ScrapingStatusType.SUCCESS,
                                "completed",
                                null,
                                "run-1"
                        )),
                        2,
                        10,
                        11L,
                        2
                )
        );

        assertThat(result.page()).isEqualTo(2);
        assertThat(result.size()).isEqualTo(10);
        assertThat(result.totalElements()).isEqualTo(11L);
        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().getFirst().logId()).isEqualTo(10L);
        assertThat(result.content().getFirst().occurredAt()).isEqualTo(occurredAt);
        assertThat(result.content().getFirst().sourceName()).isEqualTo("wanted");
        assertThat(result.content().getFirst().status()).isEqualTo(ScrapingStatusType.SUCCESS);
        assertThat(result.content().getFirst().runId()).isEqualTo("run-1");
    }
}
