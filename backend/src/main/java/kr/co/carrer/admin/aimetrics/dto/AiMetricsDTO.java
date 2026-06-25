package kr.co.carrer.admin.aimetrics.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class AiMetricsDTO {

    private AiMetricsDTO() {
    }

    @Schema(description = "AI 사용량 요약 응답")
    public record ResponseSummary(
            @Schema(description = "전체 요청 수") long totalRequests,
            @Schema(description = "전체 입력 토큰 수") long totalInputTokens,
            @Schema(description = "전체 출력 토큰 수") long totalOutputTokens,
            @Schema(description = "전체 비용") BigDecimal totalCost,
            @Schema(description = "문서 기능 요청 수") long documentRequests,
            @Schema(description = "면접 기능 요청 수") long interviewRequests,
            @Schema(description = "관리자 CS AI 요청 수") long adminCsRequests,
            @Schema(description = "관리자 리포트 AI 분석 요청 수") long adminReportRequests,
            @Schema(description = "활성 모델 ID") Long activeModelId,
            @Schema(description = "활성 모델명") String activeModelName
    ) {
    }

    @Schema(description = "도메인별 AI 사용량 응답")
    public record ResponseDomainUsage(
            @Schema(description = "문서 기능 사용량") ResponseFeatureUsage document,
            @Schema(description = "면접 기능 사용량") ResponseFeatureUsage interview,
            @Schema(description = "관리자 CS AI 사용량") ResponseFeatureUsage adminCs,
            @Schema(description = "관리자 리포트 AI 분석 사용량") ResponseFeatureUsage adminReport
    ) {
    }

    @Schema(description = "기능별 AI 사용량 응답")
    public record ResponseFeatureUsage(
            @Schema(description = "요청 수") long requestCount,
            @Schema(description = "입력 토큰 수") long inputTokens,
            @Schema(description = "출력 토큰 수") long outputTokens,
            @Schema(description = "비용") BigDecimal cost
    ) {
    }

    @Schema(description = "토큰 사용 추이 응답")
    public record ResponseTokenTrend(
            @Schema(description = "집계 단위", allowableValues = {"HOURLY", "DAILY"}) String interval,
            @Schema(description = "토큰 사용 추이 지점 목록") List<ResponseTokenTrendPoint> points
    ) {
    }

    @Schema(description = "토큰 사용 추이 지점 응답")
    public record ResponseTokenTrendPoint(
            @Schema(description = "집계 버킷") String bucket,
            @Schema(description = "입력 토큰 수") long inputTokens,
            @Schema(description = "출력 토큰 수") long outputTokens,
            @Schema(description = "비용") BigDecimal cost
    ) {
    }

    @Schema(description = "고사용 사용자 목록 응답")
    public record ResponseHeavyUsers(
            @Schema(description = "고사용 사용자 목록") List<ResponseHeavyUser> users
    ) {
    }

    @Schema(description = "고사용 사용자 응답")
    public record ResponseHeavyUser(
            @Schema(description = "회원 ID") UUID memberId,
            @Schema(description = "요청 수") long requestCount,
            @Schema(description = "입력 토큰 수") long inputTokens,
            @Schema(description = "출력 토큰 수") long outputTokens,
            @Schema(description = "비용") BigDecimal cost
    ) {
    }
}
