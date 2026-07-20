package kr.co.carrer.admin.aimetrics.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class AiMetricsDTO {

    private AiMetricsDTO() {
    }

    @Schema(description = "AI usage summary response")
    public record ResponseSummary(
            @Schema(description = "Total requests") long totalRequests,
            @Schema(description = "Total input tokens") long totalInputTokens,
            @Schema(description = "Total output tokens") long totalOutputTokens,
            @Schema(description = "Total cost") BigDecimal totalCost,
            @Schema(description = "Document requests") long documentRequests,
            @Schema(description = "Interview requests") long interviewRequests,
            @Schema(description = "Admin CS requests") long adminCsRequests,
            @Schema(description = "Admin report requests") long adminReportRequests,
            @Schema(description = "Active model ID") Long activeModelId,
            @Schema(description = "Active model name") String activeModelName
    ) {
    }

    @Schema(description = "Domain AI usage response")
    public record ResponseDomainUsage(
            @Schema(description = "Document usage") ResponseFeatureUsage document,
            @Schema(description = "Interview usage") ResponseFeatureUsage interview,
            @Schema(description = "Admin CS usage") ResponseFeatureUsage adminCs,
            @Schema(description = "Admin report usage") ResponseFeatureUsage adminReport
    ) {
    }

    @Schema(description = "Feature AI usage response")
    public record ResponseFeatureUsage(
            @Schema(description = "Request count") long requestCount,
            @Schema(description = "Input tokens") long inputTokens,
            @Schema(description = "Output tokens") long outputTokens,
            @Schema(description = "Cost") BigDecimal cost
    ) {
    }

    @Schema(description = "Token trend response")
    public record ResponseTokenTrend(
            @Schema(description = "Aggregation interval", allowableValues = {"HOURLY", "DAILY"}) String interval,
            @Schema(description = "Trend points") List<ResponseTokenTrendPoint> points
    ) {
    }

    @Schema(description = "Token trend point response")
    public record ResponseTokenTrendPoint(
            @Schema(description = "Aggregation bucket") String bucket,
            @Schema(description = "Input tokens") long inputTokens,
            @Schema(description = "Output tokens") long outputTokens,
            @Schema(description = "Cost") BigDecimal cost
    ) {
    }

    @Schema(description = "Heavy users response")
    public record ResponseHeavyUsers(
            @Schema(description = "Heavy user list") List<ResponseHeavyUser> users
    ) {
    }

    @Schema(description = "Heavy user response")
    public record ResponseHeavyUser(
            @Schema(description = "Member ID") UUID memberId,
            @Schema(description = "Request count") long requestCount,
            @Schema(description = "Input tokens") long inputTokens,
            @Schema(description = "Output tokens") long outputTokens,
            @Schema(description = "Total tokens") long totalTokens,
            @Schema(description = "Cost") BigDecimal cost
    ) {
    }
}
