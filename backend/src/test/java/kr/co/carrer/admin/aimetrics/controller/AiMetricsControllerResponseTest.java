package kr.co.carrer.admin.aimetrics.controller;

import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
import kr.co.carrer.global.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AiMetricsControllerResponseTest {

    private final AiMetricsService aiMetricsService = mock(AiMetricsService.class);
    private final AiMetricsController aiMetricsController = new AiMetricsController(aiMetricsService);

    @Test
    @DisplayName("AI 사용 로그 목록을 ApiResponse와 1-based 페이지 응답으로 반환한다")
    void returnsUsageLogsWithApiResponseAndOneBasedPagination() {
        UUID memberId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID sessionId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-17T10:30:00Z");
        given(aiMetricsService.getUsageLogs(AiFeatureType.INTERVIEW, 2, 10))
                .willReturn(new AiMetricsService.ResponseUsageLogList(
                        List.of(new AiMetricsService.ResponseUsageLogItem(
                                15L,
                                memberId,
                                null,
                                sessionId,
                                3L,
                                AiFeatureType.INTERVIEW,
                                1_500L,
                                700L,
                                new BigDecimal("0.42"),
                                createdAt
                        )),
                        2,
                        10,
                        21L,
                        3
                ));

        var response = aiMetricsController.getUsageLogs(AiFeatureType.INTERVIEW, 2, 10);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        ApiResponse<?> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getStatusCode()).isEqualTo(200);
        assertThat(body.getData()).isNotNull();
        var data = response.getBody().getData();
        assertThat(data.page()).isEqualTo(2);
        assertThat(data.size()).isEqualTo(10);
        assertThat(data.totalElements()).isEqualTo(21L);
        assertThat(data.totalPages()).isEqualTo(3);
        assertThat(data.content()).hasSize(1);
        assertThat(data.content().getFirst().aiUsageLogId()).isEqualTo(15L);
        verify(aiMetricsService).getUsageLogs(AiFeatureType.INTERVIEW, 2, 10);
    }

    @Test
    @DisplayName("RAG 문서 목록을 ApiResponse와 1-based 페이지 응답으로 반환한다")
    void returnsRagDocumentsWithApiResponseAndOneBasedPagination() {
        UUID fileUuid = UUID.fromString("33333333-3333-3333-3333-333333333333");
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-17T09:00:00Z");
        ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-17T09:10:00Z");
        given(aiMetricsService.getRagDocuments(3, 5))
                .willReturn(new AiMetricsService.ResponseRagDocumentList(
                        List.of(new AiMetricsService.ResponseRagDocumentItem(
                                7L,
                                10L,
                                fileUuid,
                                "faq.pdf",
                                "application/pdf",
                                182_030L,
                                12,
                                100,
                                RagDocumentStatusType.COMPLETED,
                                createdAt,
                                updatedAt
                        )),
                        3,
                        5,
                        11L,
                        3
                ));

        var response = aiMetricsController.getRagDocuments(3, 5);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        ApiResponse<?> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getStatusCode()).isEqualTo(200);
        assertThat(body.getData()).isNotNull();
        var data = response.getBody().getData();
        assertThat(data.page()).isEqualTo(3);
        assertThat(data.size()).isEqualTo(5);
        assertThat(data.totalElements()).isEqualTo(11L);
        assertThat(data.totalPages()).isEqualTo(3);
        assertThat(data.content()).hasSize(1);
        assertThat(data.content().getFirst().ragDocumentId()).isEqualTo(7L);
        verify(aiMetricsService).getRagDocuments(3, 5);
    }
}
