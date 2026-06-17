package kr.co.carrer.admin.aimetrics.service;

import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public interface AiMetricsService {

    ResponseSummary getSummary(String from, String to, AiFeatureType featureType);

    ResponseDomainUsage getDomainUsage(String from, String to);

    ResponseTokenTrend getTokenTrend(String from, String to, AiFeatureType featureType, String interval);

    ResponseHeavyUsers getHeavyUsers(String from, String to, AiFeatureType featureType, Integer limit);

    ResponseUsageLogList getUsageLogs(AiFeatureType featureType, int page, int size);

    ResponseBudget getBudget();

    ResponseBudget updateBudget(RequestUpdateBudget command, Long actorAdminId, String ipAddress);

    ResponseBudget updateDiscordAlert(RequestUpdateDiscordAlert command, Long actorAdminId, String ipAddress);

    ResponseBudget updateRateLimit(RequestUpdateRateLimit command, Long actorAdminId, String ipAddress);

    ResponseRagDocumentList getRagDocuments(int page, int size);

    ResponseRagDocumentDetail uploadRagDocument(MultipartFile file, Long actorAdminId, String ipAddress);

    ResponseRagDocumentDownload getRagDocumentDownload(Long documentId);

    ResponseRagDocumentDelete deleteRagDocument(Long documentId, Long actorAdminId, String ipAddress);

    record ResponseSummary(
            long totalRequests,
            long totalInputTokens,
            long totalOutputTokens,
            BigDecimal totalCost,
            long documentRequests,
            long interviewRequests,
            Long activeModelId,
            String activeModelName
    ) {
    }

    record ResponseDomainUsage(
            ResponseFeatureUsage document,
            ResponseFeatureUsage interview
    ) {
    }

    record ResponseFeatureUsage(
            long requestCount,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record ResponseTokenTrend(
            String interval,
            List<ResponseTokenTrendPoint> points
    ) {
    }

    record ResponseTokenTrendPoint(
            String bucket,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record ResponseHeavyUsers(
            List<ResponseHeavyUser> users
    ) {
    }

    record ResponseHeavyUser(
            UUID memberId,
            long requestCount,
            long inputTokens,
            long outputTokens,
            BigDecimal cost
    ) {
    }

    record ResponseUsageLogItem(
            Long aiUsageLogId,
            UUID memberId,
            UUID sessionId,
            Long aiModelId,
            AiFeatureType featureType,
            long inputTokens,
            long outputTokens,
            BigDecimal cost,
            ZonedDateTime createdAt
    ) {
    }

    record ResponseUsageLogList(
            List<ResponseUsageLogItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record RequestUpdateBudget(
            Long selectedModelId,
            BigDecimal monthlyBudget,
            int alertThreshold
    ) {
    }

    record RequestUpdateDiscordAlert(
            Boolean alertEnabled
    ) {
    }

    record RequestUpdateRateLimit(
            Boolean rateLimitEnabled
    ) {
    }

    record ResponseBudget(
            Long aiOpsSettingId,
            Long selectedModelId,
            BigDecimal monthlyBudget,
            boolean alertEnabled,
            AlertChannelType alertChannel,
            int alertThreshold,
            boolean rateLimitEnabled,
            ZonedDateTime updatedAt
    ) {
    }

    record ResponseRagDocumentItem(
            Long ragDocumentId,
            Long uploadedBy,
            UUID fileUuid,
            String originalFileName,
            String mimeType,
            Long fileSize,
            int chunkCount,
            int indexingProgress,
            RagDocumentStatusType status,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record ResponseRagDocumentDetail(
            Long ragDocumentId,
            Long uploadedBy,
            UUID fileUuid,
            String originalFileName,
            String filePath,
            String mimeType,
            Long fileSize,
            int chunkCount,
            int indexingProgress,
            RagDocumentStatusType status,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record ResponseRagDocumentList(
            List<ResponseRagDocumentItem> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    record ResponseRagDocumentDownload(
            Long ragDocumentId,
            String originalFileName,
            UUID fileUuid,
            String mimeType,
            Long fileSize,
            String downloadUrl
    ) {
    }

    record ResponseRagDocumentDelete(
            Long ragDocumentId,
            boolean deleted
    ) {
    }
}
