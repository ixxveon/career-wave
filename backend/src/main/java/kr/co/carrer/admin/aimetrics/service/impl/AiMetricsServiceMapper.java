package kr.co.carrer.admin.aimetrics.service.impl;

import kr.co.carrer.admin.aimetrics.entity.AiOpsSetting;
import kr.co.carrer.admin.aimetrics.entity.RagDocument;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import org.springframework.data.domain.Page;

final class AiMetricsServiceMapper {

    private AiMetricsServiceMapper() {
    }

    static AiMetricsService.ResponseSummary toSummary(AiMetricsFastApiGateway.SummaryResponse response) {
        return new AiMetricsService.ResponseSummary(
                response.totalRequests(),
                response.totalInputTokens(),
                response.totalOutputTokens(),
                response.totalCost(),
                response.documentRequests(),
                response.interviewRequests(),
                response.adminCsRequests(),
                response.adminReportRequests(),
                response.activeModelId(),
                response.activeModelName()
        );
    }

    static AiMetricsService.ResponseDomainUsage toDomainUsage(AiMetricsFastApiGateway.DomainUsageResponse response) {
        return new AiMetricsService.ResponseDomainUsage(
                toFeatureUsage(response.document()),
                toFeatureUsage(response.interview()),
                toFeatureUsage(response.adminCs()),
                toFeatureUsage(response.adminReport())
        );
    }

    static AiMetricsService.ResponseTokenTrend toTokenTrend(AiMetricsFastApiGateway.TokenTrendResponse response) {
        return new AiMetricsService.ResponseTokenTrend(
                response.interval(),
                response.points().stream()
                        .map(AiMetricsServiceMapper::toTokenTrendPoint)
                        .toList()
        );
    }

    static AiMetricsService.ResponseHeavyUsers toHeavyUsers(AiMetricsFastApiGateway.HeavyUsersResponse response) {
        return new AiMetricsService.ResponseHeavyUsers(
                response.users().stream()
                        .map(AiMetricsServiceMapper::toHeavyUser)
                        .toList()
        );
    }

    static AiMetricsService.ResponseUsageLogList toUsageLogList(AiMetricsFastApiGateway.UsageLogListResponse response) {
        return new AiMetricsService.ResponseUsageLogList(
                response.content().stream()
                        .map(AiMetricsServiceMapper::toUsageLogItem)
                        .toList(),
                response.page(),
                response.size(),
                response.totalElements(),
                response.totalPages()
        );
    }

    static AiMetricsService.ResponseBudget toBudget(AiOpsSetting setting) {
        return new AiMetricsService.ResponseBudget(
                setting.getAiOpsSettingId(),
                setting.getSelectedModelId(),
                setting.getMonthlyBudget(),
                setting.isAlertEnabled(),
                setting.getAlertChannel(),
                setting.getAlertThreshold(),
                setting.isRateLimitEnabled(),
                setting.getUpdatedAt()
        );
    }

    static AiMetricsService.ResponseRagDocumentList toRagDocumentList(Page<RagDocument> page, int responsePage, int responseSize) {
        return new AiMetricsService.ResponseRagDocumentList(
                page.getContent().stream()
                        .map(AiMetricsServiceMapper::toRagDocumentItem)
                        .toList(),
                responsePage,
                responseSize,
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    static AiMetricsService.ResponseRagDocumentDetail toRagDocumentDetail(RagDocument document) {
        return new AiMetricsService.ResponseRagDocumentDetail(
                document.getRagDocumentId(),
                document.getUploadedBy(),
                document.getFileUuid(),
                document.getOriginalFileName(),
                document.getFilePath(),
                document.getMimeType(),
                document.getFileSize(),
                document.getChunkCount(),
                document.getIndexingProgress(),
                document.getStatus(),
                document.getCreatedAt(),
                document.getUpdatedAt()
        );
    }

    static AiMetricsService.ResponseRagDocumentDownload toRagDocumentDownload(RagDocument document, String downloadUrl) {
        return new AiMetricsService.ResponseRagDocumentDownload(
                document.getRagDocumentId(),
                document.getOriginalFileName(),
                document.getFileUuid(),
                document.getMimeType(),
                document.getFileSize(),
                downloadUrl
        );
    }

    private static AiMetricsService.ResponseFeatureUsage toFeatureUsage(AiMetricsFastApiGateway.FeatureUsageResponse response) {
        return new AiMetricsService.ResponseFeatureUsage(
                response.requestCount(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsService.ResponseTokenTrendPoint toTokenTrendPoint(AiMetricsFastApiGateway.TokenTrendPointResponse response) {
        return new AiMetricsService.ResponseTokenTrendPoint(
                response.bucket(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsService.ResponseHeavyUser toHeavyUser(AiMetricsFastApiGateway.HeavyUserResponse response) {
        return new AiMetricsService.ResponseHeavyUser(
                response.memberId(),
                response.adminId(),
                response.requestCount(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost()
        );
    }

    private static AiMetricsService.ResponseUsageLogItem toUsageLogItem(AiMetricsFastApiGateway.UsageLogItemResponse response) {
        return new AiMetricsService.ResponseUsageLogItem(
                response.aiUsageLogId(),
                response.memberId(),
                response.adminId(),
                response.sessionId(),
                response.aiModelId(),
                response.featureType(),
                response.inputTokens(),
                response.outputTokens(),
                response.cost(),
                response.createdAt()
        );
    }

    private static AiMetricsService.ResponseRagDocumentItem toRagDocumentItem(RagDocument document) {
        return new AiMetricsService.ResponseRagDocumentItem(
                document.getRagDocumentId(),
                document.getUploadedBy(),
                document.getFileUuid(),
                document.getOriginalFileName(),
                document.getMimeType(),
                document.getFileSize(),
                document.getChunkCount(),
                document.getIndexingProgress(),
                document.getStatus(),
                document.getCreatedAt(),
                document.getUpdatedAt()
        );
    }
}
