package kr.co.carrer.admin.scraping.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.audit.util.AdminAuditClientIpExtractor;
import kr.co.carrer.admin.scraping.docs.ScrapingDocs;
import kr.co.carrer.admin.scraping.dto.ScrapingLogDTO;
import kr.co.carrer.admin.scraping.dto.ScrapingPipelineDTO;
import kr.co.carrer.admin.scraping.service.ScrapingService;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.auth.principal.AdminPrincipalResolver;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/scraping")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('BACKEND'))")
public class ScrapingController implements ScrapingDocs {

    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_SIZE = 20;

    private final ScrapingService scrapingService;

    @GetMapping("/pipelines")
    public ResponseEntity<ApiResponse<ScrapingPipelineDTO.ResponsePipelinePage>> getPipelines(
            @Valid @ModelAttribute ScrapingPipelineDTO.RequestList request
    ) {
        int effectivePage = getPageOrDefault(request.page());
        int effectiveSize = getSizeOrDefault(request.size());

        ScrapingService.ResponsePipelinePage result = scrapingService.getPipelines(
                request.keyword(),
                request.status(),
                effectivePage,
                effectiveSize
        );

        ScrapingPipelineDTO.ResponsePipelinePage response = new ScrapingPipelineDTO.ResponsePipelinePage(
                result.content().stream()
                        .map(item -> new ScrapingPipelineDTO.ResponsePipelineItem(
                                item.scrapingPipelineId(),
                                item.sourceName(),
                                item.displayName(),
                                item.pipelineStatus(),
                                item.isEnabled(),
                                item.lastStartedAt(),
                                item.lastSuccessAt(),
                                item.lastFailedAt(),
                                item.lastDurationMs(),
                                item.lastTotalCount(),
                                item.lastErrorMessage(),
                                item.createdAt(),
                                item.updatedAt()
                        ))
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 파이프라인 목록 조회에 성공했습니다.", response));
    }

    @GetMapping("/pipelines/summary")
    public ResponseEntity<ApiResponse<ScrapingPipelineDTO.ResponseSummary>> getSummary() {
        ScrapingService.ResponseSummary result = scrapingService.getSummary();

        ScrapingPipelineDTO.ResponseSummary response = new ScrapingPipelineDTO.ResponseSummary(
                result.totalCount(),
                result.idleCount(),
                result.runningCount(),
                result.successCount(),
                result.failedCount(),
                result.enabledCount(),
                result.disabledCount()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 파이프라인 요약 조회에 성공했습니다.", response));
    }

    @GetMapping("/pipelines/{sourceName}")
    public ResponseEntity<ApiResponse<ScrapingPipelineDTO.ResponseDetail>> getPipelineDetail(
            @PathVariable String sourceName
    ) {
        ScrapingService.ResponseDetail result = scrapingService.getPipelineDetail(sourceName);

        ScrapingPipelineDTO.ResponseDetail response = new ScrapingPipelineDTO.ResponseDetail(
                result.scrapingPipelineId(),
                result.sourceName(),
                result.displayName(),
                result.pipelineStatus(),
                result.isEnabled(),
                result.lastStartedAt(),
                result.lastSuccessAt(),
                result.lastFailedAt(),
                result.lastDurationMs(),
                result.lastTotalCount(),
                result.lastErrorMessage(),
                result.createdAt(),
                result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 파이프라인 상세 조회에 성공했습니다.", response));
    }

    @PostMapping("/pipelines/{sourceName}/actions")
    public ResponseEntity<ApiResponse<ScrapingPipelineDTO.ResponseAction>> requestAction(
            @PathVariable String sourceName,
            @Valid @RequestBody ScrapingPipelineDTO.RequestAction request,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        ScrapingService.ResponseAction result = scrapingService.requestAction(
                sourceName,
                new ScrapingService.RequestAction(
                        request.actionType(),
                        request.reason()
                ),
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );

        ScrapingPipelineDTO.ResponseAction response = new ScrapingPipelineDTO.ResponseAction(
                result.sourceName(),
                result.requestedAction(),
                result.accepted(),
                result.runId(),
                result.requestedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 파이프라인 액션 요청에 성공했습니다.", response));
    }

    @PostMapping("/pipelines/batch-actions")
    public ResponseEntity<ApiResponse<ScrapingPipelineDTO.ResponseBatchAction>> requestBatchAction(
            @Valid @RequestBody ScrapingPipelineDTO.RequestBatchAction request,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        ScrapingService.ResponseBatchAction result = scrapingService.requestBatchAction(
                new ScrapingService.RequestBatchAction(
                        request.actionType(),
                        request.reason(),
                        request.sourceNames()
                ),
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );

        ScrapingPipelineDTO.ResponseBatchAction response = new ScrapingPipelineDTO.ResponseBatchAction(
                result.requestedCount(),
                result.acceptedCount(),
                result.failedCount(),
                result.results().stream()
                        .map(item -> new ScrapingPipelineDTO.ResponseBatchActionResult(
                                item.sourceName(),
                                item.accepted(),
                                item.message()
                        ))
                        .toList()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 파이프라인 배치 액션 요청에 성공했습니다.", response));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<ScrapingLogDTO.ResponseLogPage>> getLogs(
            @Valid @ModelAttribute ScrapingLogDTO.RequestList request
    ) {
        int effectivePage = getPageOrDefault(request.page());
        int effectiveSize = getSizeOrDefault(request.size());

        ScrapingService.ResponseLogPage result = scrapingService.getLogs(
                request.sourceName(),
                request.status(),
                effectivePage,
                effectiveSize
        );

        ScrapingLogDTO.ResponseLogPage response = new ScrapingLogDTO.ResponseLogPage(
                result.content().stream()
                        .map(item -> new ScrapingLogDTO.ResponseLogItem(
                                item.logId(),
                                item.occurredAt(),
                                item.sourceName(),
                                item.status(),
                                item.message(),
                                item.detail(),
                                item.runId()
                        ))
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("스크래핑 실행 로그 조회에 성공했습니다.", response));
    }

    private int getPageOrDefault(Integer page) {
        return page == null ? DEFAULT_PAGE : page;
    }

    private int getSizeOrDefault(Integer size) {
        return size == null ? DEFAULT_SIZE : size;
    }

}
