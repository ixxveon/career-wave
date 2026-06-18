package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AiMetricsFastApiMapperTest {

    @Test
    @DisplayName("FastAPI summary 집계 응답을 gateway 응답으로 매핑한다")
    void mapsSummaryAggregationResponse() {
        AiMetricsFastApiGateway.SummaryResponse result = AiMetricsFastApiMapper.toSummaryResponse(
                new AiMetricsFastApiResponse.Summary(
                        120L,
                        45_000L,
                        18_000L,
                        new BigDecimal("12.75"),
                        80L,
                        40L,
                        3L,
                        "gpt-4o-mini"
                )
        );

        assertThat(result.totalRequests()).isEqualTo(120L);
        assertThat(result.totalInputTokens()).isEqualTo(45_000L);
        assertThat(result.totalOutputTokens()).isEqualTo(18_000L);
        assertThat(result.totalCost()).isEqualByComparingTo("12.75");
        assertThat(result.documentRequests()).isEqualTo(80L);
        assertThat(result.interviewRequests()).isEqualTo(40L);
        assertThat(result.activeModelId()).isEqualTo(3L);
        assertThat(result.activeModelName()).isEqualTo("gpt-4o-mini");
    }

    @Test
    @DisplayName("FastAPI domain-usage 집계 응답을 gateway 응답으로 매핑한다")
    void mapsDomainUsageAggregationResponse() {
        AiMetricsFastApiGateway.DomainUsageResponse result = AiMetricsFastApiMapper.toDomainUsageResponse(
                new AiMetricsFastApiResponse.DomainUsage(
                        new AiMetricsFastApiResponse.FeatureUsage(70L, 30_000L, 12_000L, new BigDecimal("8.40")),
                        new AiMetricsFastApiResponse.FeatureUsage(50L, 15_000L, 6_000L, new BigDecimal("4.35"))
                )
        );

        assertThat(result.document().requestCount()).isEqualTo(70L);
        assertThat(result.document().inputTokens()).isEqualTo(30_000L);
        assertThat(result.document().outputTokens()).isEqualTo(12_000L);
        assertThat(result.document().cost()).isEqualByComparingTo("8.40");
        assertThat(result.interview().requestCount()).isEqualTo(50L);
        assertThat(result.interview().inputTokens()).isEqualTo(15_000L);
        assertThat(result.interview().outputTokens()).isEqualTo(6_000L);
        assertThat(result.interview().cost()).isEqualByComparingTo("4.35");
    }

    @Test
    @DisplayName("FastAPI token-trend 집계 응답을 gateway 응답으로 매핑한다")
    void mapsTokenTrendAggregationResponse() {
        AiMetricsFastApiGateway.TokenTrendResponse result = AiMetricsFastApiMapper.toTokenTrendResponse(
                new AiMetricsFastApiResponse.TokenTrend(
                        "DAILY",
                        List.of(new AiMetricsFastApiResponse.TokenTrendPoint(
                                "2026-06-17",
                                12_000L,
                                5_000L,
                                new BigDecimal("2.55")
                        ))
                )
        );

        assertThat(result.interval()).isEqualTo("DAILY");
        assertThat(result.points()).hasSize(1);
        assertThat(result.points().getFirst().bucket()).isEqualTo("2026-06-17");
        assertThat(result.points().getFirst().inputTokens()).isEqualTo(12_000L);
        assertThat(result.points().getFirst().outputTokens()).isEqualTo(5_000L);
        assertThat(result.points().getFirst().cost()).isEqualByComparingTo("2.55");
    }

    @Test
    @DisplayName("FastAPI heavy-users 집계 응답을 gateway 응답으로 매핑한다")
    void mapsHeavyUsersAggregationResponse() {
        UUID memberId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        AiMetricsFastApiGateway.HeavyUsersResponse result = AiMetricsFastApiMapper.toHeavyUsersResponse(
                new AiMetricsFastApiResponse.HeavyUsers(List.of(new AiMetricsFastApiResponse.HeavyUser(
                        memberId,
                        35L,
                        20_000L,
                        8_000L,
                        new BigDecimal("5.20")
                )))
        );

        assertThat(result.users()).hasSize(1);
        assertThat(result.users().getFirst().memberId()).isEqualTo(memberId);
        assertThat(result.users().getFirst().requestCount()).isEqualTo(35L);
        assertThat(result.users().getFirst().inputTokens()).isEqualTo(20_000L);
        assertThat(result.users().getFirst().outputTokens()).isEqualTo(8_000L);
        assertThat(result.users().getFirst().cost()).isEqualByComparingTo("5.20");
    }

    @Test
    @DisplayName("FastAPI usage logs 검색 응답을 gateway 페이지 응답으로 매핑한다")
    void mapsUsageLogsSearchResponse() {
        UUID memberId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID sessionId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-17T10:30:00Z");

        AiMetricsFastApiGateway.UsageLogListResponse result = AiMetricsFastApiMapper.toUsageLogListResponse(
                new AiMetricsFastApiResponse.UsageLogList(
                        List.of(new AiMetricsFastApiResponse.UsageLogItem(
                                15L,
                                memberId,
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
                )
        );

        assertThat(result.page()).isEqualTo(2);
        assertThat(result.size()).isEqualTo(10);
        assertThat(result.totalElements()).isEqualTo(21L);
        assertThat(result.totalPages()).isEqualTo(3);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().getFirst().aiUsageLogId()).isEqualTo(15L);
        assertThat(result.content().getFirst().memberId()).isEqualTo(memberId);
        assertThat(result.content().getFirst().sessionId()).isEqualTo(sessionId);
        assertThat(result.content().getFirst().aiModelId()).isEqualTo(3L);
        assertThat(result.content().getFirst().featureType()).isEqualTo(AiFeatureType.INTERVIEW);
        assertThat(result.content().getFirst().inputTokens()).isEqualTo(1_500L);
        assertThat(result.content().getFirst().outputTokens()).isEqualTo(700L);
        assertThat(result.content().getFirst().cost()).isEqualByComparingTo("0.42");
        assertThat(result.content().getFirst().createdAt()).isEqualTo(createdAt);
    }

    @Test
    @DisplayName("운영 정책 변경 후 FastAPI 설정 동기화 요청과 응답을 매핑한다")
    void mapsOpsSettingSyncRequestAndResponse() {
        AiMetricsFastApiRequest.OpsSettingSync request = AiMetricsFastApiMapper.toOpsSettingSyncRequest(
                new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                        1L,
                        3L,
                        new BigDecimal("1000000.00"),
                        true,
                        AlertChannelType.DISCORD,
                        80,
                        true
                )
        );

        assertThat(request.aiOpsSettingId()).isEqualTo(1L);
        assertThat(request.selectedModelId()).isEqualTo(3L);
        assertThat(request.monthlyBudget()).isEqualByComparingTo("1000000.00");
        assertThat(request.alertEnabled()).isTrue();
        assertThat(request.alertChannel()).isEqualTo(AlertChannelType.DISCORD);
        assertThat(request.alertThreshold()).isEqualTo(80);
        assertThat(request.rateLimitEnabled()).isTrue();

        AiMetricsFastApiGateway.OpsSettingSyncResponse response = AiMetricsFastApiMapper.toOpsSettingSyncResponse(
                new AiMetricsFastApiResponse.OpsSettingSync(
                        true,
                        ZonedDateTime.parse("2026-06-17T11:00:00Z")
                )
        );

        assertThat(response.synced()).isTrue();
    }

    @Test
    @DisplayName("RAG 업로드 후 FastAPI 인덱싱 시작 요청과 응답을 매핑한다")
    void mapsRagIndexStartRequestAndResponse() {
        UUID fileUuid = UUID.fromString("44444444-4444-4444-4444-444444444444");

        AiMetricsFastApiRequest.RagIndexStart request = AiMetricsFastApiMapper.toRagIndexStartRequest(
                new AiMetricsFastApiGateway.RagIndexStartRequest(
                        9L,
                        fileUuid,
                        "faq.pdf",
                        "/rag/2026/06/faq.pdf",
                        "application/pdf",
                        182_030L
                )
        );

        assertThat(request.ragDocumentId()).isEqualTo(9L);
        assertThat(request.fileUuid()).isEqualTo(fileUuid);
        assertThat(request.originalFileName()).isEqualTo("faq.pdf");
        assertThat(request.filePath()).isEqualTo("/rag/2026/06/faq.pdf");
        assertThat(request.mimeType()).isEqualTo("application/pdf");
        assertThat(request.fileSize()).isEqualTo(182_030L);

        AiMetricsFastApiGateway.RagIndexStartResponse response = AiMetricsFastApiMapper.toRagIndexStartResponse(
                new AiMetricsFastApiResponse.RagIndexStart(
                        true,
                        9L,
                        "INDEXING"
                )
        );

        assertThat(response.accepted()).isTrue();
        assertThat(response.ragDocumentId()).isEqualTo(9L);
    }
}
