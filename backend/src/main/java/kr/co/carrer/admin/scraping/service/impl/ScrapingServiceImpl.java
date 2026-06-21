package kr.co.carrer.admin.scraping.service.impl;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.admin.scraping.service.ScrapingFastApiGateway;
import kr.co.carrer.admin.scraping.service.ScrapingService;
import kr.co.carrer.admin.scraping.type.ScrapingPipelineStatusType;
import kr.co.carrer.admin.scraping.type.ScrapingStatusType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScrapingServiceImpl implements ScrapingService {

    private static final String REQUESTED_BY_ADMIN_SERVICE = "admin-service";
    private static final String TARGET_TYPE_SCRAPING_PIPELINE = "SCRAPING_PIPELINE";
    private static final String TARGET_TYPE_SCRAPING_BATCH = "SCRAPING_BATCH";

    private final ObjectProvider<ScrapingFastApiGateway> scrapingFastApiGatewayProvider;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(readOnly = true)
    public ResponsePipelinePage getPipelines(String keyword, ScrapingPipelineStatusType status, int page, int size) {
        try {
            validateExternalPageRequest(page, size);
            return ScrapingServiceMapper.toPipelinePage(
                    getFastApiGateway().getPipelines(new ScrapingFastApiGateway.PipelineSearchRequest(
                            keyword,
                            status,
                            page,
                            size
                    ))
            );
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toReadException(exception);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseSummary getSummary() {
        try {
            return ScrapingServiceMapper.toSummary(getFastApiGateway().getSummary());
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toReadException(exception);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseDetail getPipelineDetail(String sourceName) {
        try {
            return ScrapingServiceMapper.toDetail(getFastApiGateway().getPipelineDetail(sourceName));
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toReadException(exception);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseLogPage getLogs(String sourceName, ScrapingStatusType status, int page, int size) {
        try {
            validateExternalPageRequest(page, size);
            return ScrapingServiceMapper.toLogPage(
                    getFastApiGateway().getLogs(new ScrapingFastApiGateway.LogSearchRequest(
                            sourceName,
                            status,
                            page,
                            size
                    ))
            );
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toReadException(exception);
        }
    }

    @Override
    public ResponseAction requestAction(String sourceName, RequestAction command, Long actorAdminId, String ipAddress) {
        validateActionCommand(command);
        ScrapingFastApiGateway.ActionResponse response;
        try {
            ScrapingFastApiGateway.ActionRequest request = new ScrapingFastApiGateway.ActionRequest(
                    sourceName,
                    REQUESTED_BY_ADMIN_SERVICE
            );

            response = switch (command.actionType()) {
                case RUN -> getFastApiGateway().runPipeline(request);
                case RETRY -> getFastApiGateway().retryPipeline(request);
                case TEST -> getFastApiGateway().testPipeline(request);
            };
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toActionException(command.actionType(), exception);
        }
        ResponseAction result = ScrapingServiceMapper.toAction(response, command);
        saveActionAuditLog(actorAdminId, sourceName, command, ipAddress);
        return result;
    }

    @Override
    public ResponseBatchAction requestBatchAction(RequestBatchAction command, Long actorAdminId, String ipAddress) {
        validateBatchActionCommand(command);
        ScrapingFastApiGateway.BatchActionRequest request = new ScrapingFastApiGateway.BatchActionRequest(
                command.actionType().name(),
                command.sourceNames(),
                REQUESTED_BY_ADMIN_SERVICE
        );
        ScrapingFastApiGateway.BatchActionResponse response;
        try {
            response = getFastApiGateway().batchRunPipelines(request);
        } catch (RuntimeException exception) {
            throw ScrapingServiceExceptionMapper.toActionException(command.actionType(), exception);
        }
        ResponseBatchAction result = ScrapingServiceMapper.toBatchAction(response);
        saveBatchActionAuditLog(actorAdminId, command, ipAddress);
        return result;
    }

    private ScrapingFastApiGateway getFastApiGateway() {
        ScrapingFastApiGateway gateway = scrapingFastApiGatewayProvider.getIfAvailable();
        if (gateway == null) {
            throw notReadyYet();
        }
        return gateway;
    }

    private CustomException notReadyYet() {
        return new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    private void validateExternalPageRequest(int page, int size) {
        toInternalPageRequest(page, size);
    }

    /**
     * Scraping 외부 API는 1-based page 계약을 유지하고,
     * Spring 내부 Pageable 소비 지점에서만 page - 1 변환을 적용한다.
     */
    private PageRequest toInternalPageRequest(int page, int size) {
        if (page < 1 || size < 1) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
        return PageRequest.of(page - 1, size);
    }

    private void saveActionAuditLog(Long actorAdminId, String sourceName, RequestAction command, String ipAddress) {
        validateActorAdminId(actorAdminId);
        AuditLog auditLog = AuditLog.create(
                actorAdminId,
                AuditLogType.SCRAPING_SYSTEM,
                command.actionType().name(),
                TARGET_TYPE_SCRAPING_PIPELINE,
                sourceName,
                ipAddress,
                AuditLogSeverity.INFO,
                "reason=" + command.reason()
        );
        auditLogRepository.save(auditLog);
    }

    private void saveBatchActionAuditLog(Long actorAdminId, RequestBatchAction command, String ipAddress) {
        validateActorAdminId(actorAdminId);
        AuditLog auditLog = AuditLog.create(
                actorAdminId,
                AuditLogType.SCRAPING_SYSTEM,
                "BATCH_" + command.actionType().name(),
                TARGET_TYPE_SCRAPING_BATCH,
                String.join(",", command.sourceNames()),
                ipAddress,
                AuditLogSeverity.INFO,
                "reason=" + command.reason()
        );
        auditLogRepository.save(auditLog);
    }

    private void validateActorAdminId(Long actorAdminId) {
        if (actorAdminId == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validateActionCommand(RequestAction command) {
        if (command == null || command.actionType() == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private void validateBatchActionCommand(RequestBatchAction command) {
        if (command == null || command.actionType() == null || command.sourceNames() == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
