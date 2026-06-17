package kr.co.carrer.admin.aimetrics.service.impl;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.admin.aimetrics.exception.AiMetricsErrorCode;
import kr.co.carrer.admin.aimetrics.entity.AiOpsSetting;
import kr.co.carrer.admin.aimetrics.entity.RagDocument;
import kr.co.carrer.admin.aimetrics.repository.AiModelRepository;
import kr.co.carrer.admin.aimetrics.repository.AiOpsSettingRepository;
import kr.co.carrer.admin.aimetrics.repository.RagDocumentRepository;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import kr.co.carrer.admin.aimetrics.support.AiMetricsTimeZone;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiMetricsServiceImpl implements AiMetricsService {

    private static final String TARGET_TYPE_AI_OPS_SETTING = "AI_OPS_SETTING";
    private static final String TARGET_TYPE_RAG_DOCUMENT = "RAG_DOCUMENT";

    private final ObjectProvider<AiMetricsFastApiGateway> aiMetricsFastApiGatewayProvider;
    private final AuditLogRepository auditLogRepository;
    private final AiModelRepository aiModelRepository;
    private final AiOpsSettingRepository aiOpsSettingRepository;
    private final RagDocumentRepository ragDocumentRepository;

    @Override
    @Transactional(readOnly = true)
    public ResponseSummary getSummary(String from, String to, AiFeatureType featureType) {
        validatePeriod(from, to);
        return AiMetricsServiceMapper.toSummary(
                getFastApiGateway().getSummary(new AiMetricsFastApiGateway.SummaryRequest(from, to, featureType))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseDomainUsage getDomainUsage(String from, String to) {
        validatePeriod(from, to);
        return AiMetricsServiceMapper.toDomainUsage(
                getFastApiGateway().getDomainUsage(new AiMetricsFastApiGateway.PeriodRequest(from, to))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseTokenTrend getTokenTrend(String from, String to, AiFeatureType featureType, String interval) {
        validatePeriod(from, to);
        validateInterval(interval);
        return AiMetricsServiceMapper.toTokenTrend(
                getFastApiGateway().getTokenTrend(new AiMetricsFastApiGateway.TokenTrendRequest(from, to, featureType, interval))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseHeavyUsers getHeavyUsers(String from, String to, AiFeatureType featureType, Integer limit) {
        validatePeriod(from, to);
        validateLimit(limit);
        return AiMetricsServiceMapper.toHeavyUsers(
                getFastApiGateway().getHeavyUsers(new AiMetricsFastApiGateway.HeavyUsersRequest(from, to, featureType, limit))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseUsageLogList getUsageLogs(AiFeatureType featureType, int page, int size) {
        validatePageRequest(page, size);
        try {
            return AiMetricsServiceMapper.toUsageLogList(
                    getFastApiGateway().getUsageLogs(new AiMetricsFastApiGateway.UsageLogSearchRequest(featureType, page, size))
            );
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new CustomException(AiMetricsErrorCode.AI_USAGE_LOG_FETCH_FAILED);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseBudget getBudget() {
        return aiOpsSettingRepository.findSingleton()
                .map(AiMetricsServiceMapper::toBudget)
                .orElseThrow(() -> new CustomException(AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND));
    }

    @Override
    @Transactional
    public ResponseBudget updateBudget(RequestUpdateBudget command, Long actorAdminId, String ipAddress) {
        validateMonthlyBudget(command.monthlyBudget());
        validateAlertThreshold(command.alertThreshold());
        validateAiModelExists(command.selectedModelId());

        AiOpsSetting setting = getSingletonSetting();
        setting.updateBudget(command.selectedModelId(), command.monthlyBudget(), command.alertThreshold());
        runAfterCommit(() -> syncOpsSetting(setting));
        saveAuditLog(actorAdminId, "UPDATE_AI_BUDGET", TARGET_TYPE_AI_OPS_SETTING, setting.getAiOpsSettingId(), ipAddress);
        return AiMetricsServiceMapper.toBudget(setting);
    }

    @Override
    @Transactional
    public ResponseBudget updateDiscordAlert(RequestUpdateDiscordAlert command, Long actorAdminId, String ipAddress) {
        AiOpsSetting setting = getSingletonSetting();
        setting.updateDiscordAlert(command.alertEnabled());
        runAfterCommit(() -> syncOpsSetting(setting));
        saveAuditLog(actorAdminId, "UPDATE_DISCORD_ALERT", TARGET_TYPE_AI_OPS_SETTING, setting.getAiOpsSettingId(), ipAddress);
        return AiMetricsServiceMapper.toBudget(setting);
    }

    @Override
    @Transactional
    public ResponseBudget updateRateLimit(RequestUpdateRateLimit command, Long actorAdminId, String ipAddress) {
        AiOpsSetting setting = getSingletonSetting();
        setting.updateRateLimit(command.rateLimitEnabled());
        runAfterCommit(() -> syncOpsSetting(setting));
        saveAuditLog(actorAdminId, "UPDATE_RATE_LIMIT", TARGET_TYPE_AI_OPS_SETTING, setting.getAiOpsSettingId(), ipAddress);
        return AiMetricsServiceMapper.toBudget(setting);
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseRagDocumentList getRagDocuments(int page, int size) {
        validatePageRequest(page, size);
        return AiMetricsServiceMapper.toRagDocumentList(
                ragDocumentRepository.findAll(PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                page,
                size
        );
    }

    @Override
    @Transactional
    public ResponseRagDocumentDetail uploadRagDocument(MultipartFile file, Long actorAdminId, String ipAddress) {
        try {
            validateUploadFile(file);
            validateNoIndexingDocument();

            UUID fileUuid = UUID.randomUUID();
            RagDocument document = RagDocument.upload(
                    actorAdminId,
                    fileUuid,
                    file.getOriginalFilename(),
                    buildRagFilePath(fileUuid, file.getOriginalFilename()),
                    file.getContentType(),
                    file.getSize()
            );
            // TODO: Persist uploaded RAG files through the Phase 4 storage/FastAPI integration flow.

            RagDocument savedDocument = ragDocumentRepository.save(document);
            runAfterCommit(() -> startRagIndexing(savedDocument));
            saveAuditLog(actorAdminId, "UPLOAD_RAG_DOCUMENT", TARGET_TYPE_RAG_DOCUMENT, savedDocument.getRagDocumentId(), ipAddress);
            return AiMetricsServiceMapper.toRagDocumentDetail(savedDocument);
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_UPLOAD_FAILED);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseRagDocumentDownload getRagDocumentDownload(Long documentId) {
        RagDocument document = getRagDocument(documentId);
        return AiMetricsServiceMapper.toRagDocumentDownload(document, buildRagDocumentDownloadUrl(document.getRagDocumentId()));
    }

    @Override
    @Transactional
    public ResponseRagDocumentDelete deleteRagDocument(Long documentId, Long actorAdminId, String ipAddress) {
        RagDocument document = getRagDocument(documentId);
        try {
            ragDocumentRepository.delete(document);
        } catch (DataAccessException e) {
            throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED);
        }
        runAfterCommit(() -> deleteRagIndex(document));
        saveAuditLog(actorAdminId, "DELETE_RAG_DOCUMENT", TARGET_TYPE_RAG_DOCUMENT, documentId, ipAddress);
        return new ResponseRagDocumentDelete(documentId, true);
    }

    private AiMetricsFastApiGateway getFastApiGateway() {
        AiMetricsFastApiGateway gateway = aiMetricsFastApiGatewayProvider.getIfAvailable();
        if (gateway == null) {
            throw new CustomException(AiMetricsErrorCode.FASTAPI_GATEWAY_UNAVAILABLE);
        }
        return gateway;
    }

    private AiOpsSetting getSingletonSetting() {
        return aiOpsSettingRepository.findSingleton()
                .orElseThrow(() -> new CustomException(AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND));
    }

    private void syncOpsSetting(AiOpsSetting setting) {
        AiMetricsFastApiGateway.OpsSettingSyncResponse response = getFastApiGateway().syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                setting.getAiOpsSettingId(),
                setting.getSelectedModelId(),
                setting.getMonthlyBudget(),
                setting.isAlertEnabled(),
                setting.getAlertChannel(),
                setting.getAlertThreshold(),
                setting.isRateLimitEnabled()
        ));
        if (!response.synced()) {
            throw new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
        }
    }

    private void startRagIndexing(RagDocument document) {
        AiMetricsFastApiGateway.RagIndexStartResponse response = getFastApiGateway().startRagIndexing(new AiMetricsFastApiGateway.RagIndexStartRequest(
                document.getRagDocumentId(),
                document.getUploadedBy(),
                document.getFileUuid(),
                document.getOriginalFileName(),
                document.getFilePath(),
                document.getMimeType(),
                document.getFileSize()
        ));
        if (!response.accepted()) {
            throw new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
        }
    }

    private void deleteRagIndex(RagDocument document) {
        AiMetricsFastApiGateway.RagIndexDeleteResponse response = getFastApiGateway().deleteRagIndex(new AiMetricsFastApiGateway.RagIndexDeleteRequest(
                document.getRagDocumentId(),
                document.getFileUuid(),
                document.getFilePath()
        ));
        if (!response.deleted()) {
            throw new CustomException(AiMetricsErrorCode.AI_MODEL_EXECUTION_FAILED);
        }
    }

    private void runAfterCommit(Runnable task) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            task.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    task.run();
                } catch (RuntimeException exception) {
                    log.error("[AiMetricsServiceImpl] afterCommit task failed", exception);
                }
            }
        });
    }

    private void validateAiModelExists(Long selectedModelId) {
        if (selectedModelId == null || !aiModelRepository.existsById(selectedModelId)) {
            throw new CustomException(AiMetricsErrorCode.AI_MODEL_NOT_FOUND);
        }
    }

    private void validateMonthlyBudget(BigDecimal monthlyBudget) {
        if (monthlyBudget == null || monthlyBudget.compareTo(BigDecimal.ZERO) <= 0) {
            throw new CustomException(AiMetricsErrorCode.INVALID_MONTHLY_BUDGET);
        }
    }

    private void validateAlertThreshold(int alertThreshold) {
        if (alertThreshold < 1 || alertThreshold > 100) {
            throw new CustomException(AiMetricsErrorCode.INVALID_ALERT_THRESHOLD);
        }
    }

    private void validatePeriod(String from, String to) {
        Instant fromInstant = parseNullableInstant(from);
        Instant toInstant = parseNullableInstant(to);
        if (fromInstant != null && toInstant != null && fromInstant.isAfter(toInstant)) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private Instant parseNullableInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (RuntimeException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validateInterval(String interval) {
        if (!"HOURLY".equals(interval) && !"DAILY".equals(interval)) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validateLimit(Integer limit) {
        if (limit != null && limit < 1) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validatePageRequest(int page, int size) {
        if (page < 1 || size < 1) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private RagDocument getRagDocument(Long documentId) {
        return ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND));
    }

    private void validateUploadFile(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validateNoIndexingDocument() {
        if (ragDocumentRepository.existsByStatus(RagDocumentStatusType.INDEXING)) {
            throw new CustomException(AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING);
        }
    }

    private String buildRagFilePath(UUID fileUuid, String originalFileName) {
        LocalDate today = LocalDate.now(AiMetricsTimeZone.SERVICE_ZONE_ID);
        return String.format(
                "/rag/%d/%02d/%s-%s",
                today.getYear(),
                today.getMonthValue(),
                fileUuid,
                originalFileName
        );
    }

    private String buildRagDocumentDownloadUrl(Long documentId) {
        return String.format("/api/v1/admin/ai-metrics/rag-documents/%d/download", documentId);
    }

    private void saveAuditLog(Long actorAdminId, String action, String targetType, Long targetId, String ipAddress) {
        AuditLog auditLog = AuditLog.create(
                actorAdminId,
                AuditLogType.AI_METRICS_SYSTEM,
                action,
                targetType,
                targetId != null ? String.valueOf(targetId) : null,
                ipAddress,
                AuditLogSeverity.INFO,
                null
        );
        auditLogRepository.save(auditLog);
    }
}
