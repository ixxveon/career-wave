package kr.co.carrer.admin.aimetrics.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.aimetrics.docs.AiMetricsDocs;
import kr.co.carrer.admin.aimetrics.dto.AiMetricsDTO;
import kr.co.carrer.admin.aimetrics.dto.AiOpsSettingDTO;
import kr.co.carrer.admin.aimetrics.dto.AiUsageLogDTO;
import kr.co.carrer.admin.aimetrics.dto.RagDocumentDTO;
import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.IntervalType;
import kr.co.carrer.admin.audit.util.AdminAuditClientIpExtractor;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.auth.principal.AdminPrincipalResolver;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/ai-metrics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('BACKEND'))")
public class AiMetricsController implements AiMetricsDocs {

    private final AiMetricsService aiMetricsService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AiMetricsDTO.ResponseSummary>> getSummary(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) AiFeatureType featureType
    ) {
        AiMetricsService.ResponseSummary result = aiMetricsService.getSummary(from, to, featureType);
        AiMetricsDTO.ResponseSummary response = new AiMetricsDTO.ResponseSummary(
                result.totalRequests(),
                result.totalInputTokens(),
                result.totalOutputTokens(),
                result.totalCost(),
                result.documentRequests(),
                result.interviewRequests(),
                result.adminCsRequests(),
                result.adminReportRequests(),
                result.activeModelId(),
                result.activeModelName()
        );
        return ResponseEntity.ok(ApiResponse.ok("AI 사용량 요약 조회에 성공했습니다.", response));
    }

    @GetMapping("/domain-usage")
    public ResponseEntity<ApiResponse<AiMetricsDTO.ResponseDomainUsage>> getDomainUsage(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        AiMetricsService.ResponseDomainUsage result = aiMetricsService.getDomainUsage(from, to);
        AiMetricsDTO.ResponseDomainUsage response = new AiMetricsDTO.ResponseDomainUsage(
                toFeatureUsage(result.document()),
                toFeatureUsage(result.interview()),
                toFeatureUsage(result.adminCs()),
                toFeatureUsage(result.adminReport())
        );
        return ResponseEntity.ok(ApiResponse.ok("도메인별 AI 사용량 조회에 성공했습니다.", response));
    }

    @GetMapping("/token-trend")
    public ResponseEntity<ApiResponse<AiMetricsDTO.ResponseTokenTrend>> getTokenTrend(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) AiFeatureType featureType,
            @RequestParam IntervalType interval
    ) {
        AiMetricsService.ResponseTokenTrend result = aiMetricsService.getTokenTrend(from, to, featureType, interval.name());
        AiMetricsDTO.ResponseTokenTrend response = new AiMetricsDTO.ResponseTokenTrend(
                result.interval(),
                result.points().stream()
                        .map(point -> new AiMetricsDTO.ResponseTokenTrendPoint(
                                point.bucket(),
                                point.inputTokens(),
                                point.outputTokens(),
                                point.cost()
                        ))
                        .toList()
        );
        return ResponseEntity.ok(ApiResponse.ok("토큰 사용 추이 조회에 성공했습니다.", response));
    }

    @GetMapping("/heavy-users")
    public ResponseEntity<ApiResponse<AiMetricsDTO.ResponseHeavyUsers>> getHeavyUsers(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) AiFeatureType featureType,
            @RequestParam(required = false) Integer limit
    ) {
        AiMetricsService.ResponseHeavyUsers result = aiMetricsService.getHeavyUsers(from, to, featureType, limit);
        AiMetricsDTO.ResponseHeavyUsers response = new AiMetricsDTO.ResponseHeavyUsers(
                result.users().stream()
                        .map(user -> new AiMetricsDTO.ResponseHeavyUser(
                                user.memberId(),
                                user.adminId(),
                                user.requestCount(),
                                user.inputTokens(),
                                user.outputTokens(),
                                user.cost()
                        ))
                        .toList()
        );
        return ResponseEntity.ok(ApiResponse.ok("고사용 사용자 목록 조회에 성공했습니다.", response));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<AiUsageLogDTO.ResponseList>> getUsageLogs(
            @RequestParam(required = false) AiFeatureType featureType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        AiMetricsService.ResponseUsageLogList result = aiMetricsService.getUsageLogs(featureType, page, size);
        AiUsageLogDTO.ResponseList response = new AiUsageLogDTO.ResponseList(
                result.content().stream()
                        .map(item -> new AiUsageLogDTO.ResponseItem(
                                item.aiUsageLogId(),
                                item.memberId(),
                                item.adminId(),
                                item.sessionId(),
                                item.aiModelId(),
                                item.featureType(),
                                item.inputTokens(),
                                item.outputTokens(),
                                item.cost(),
                                item.createdAt()
                        ))
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()
        );
        return ResponseEntity.ok(ApiResponse.ok("AI 사용 로그 조회에 성공했습니다.", response));
    }

    @GetMapping("/budget")
    public ResponseEntity<ApiResponse<AiOpsSettingDTO.ResponseBudget>> getBudget() {
        AiMetricsService.ResponseBudget result = aiMetricsService.getBudget();
        return ResponseEntity.ok(ApiResponse.ok("AI 예산 및 알림 설정 조회에 성공했습니다.", toBudget(result)));
    }

    @PatchMapping("/budget")
    @PreAuthorize("hasRole('ADMIN') and hasRole('MASTER')")
    public ResponseEntity<ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateBudget(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateBudget request,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        AiMetricsService.ResponseBudget result = aiMetricsService.updateBudget(
                new AiMetricsService.RequestUpdateBudget(
                        request.selectedModelId(),
                        request.monthlyBudget(),
                        request.alertThreshold()
                ),
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );
        return ResponseEntity.ok(ApiResponse.ok("AI 예산 및 임계치 수정에 성공했습니다.", toBudget(result)));
    }

    @PatchMapping("/alerts/discord")
    public ResponseEntity<ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateDiscordAlert(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateDiscordAlert request,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        AiMetricsService.ResponseBudget result = aiMetricsService.updateDiscordAlert(
                new AiMetricsService.RequestUpdateDiscordAlert(request.alertEnabled()),
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );
        return ResponseEntity.ok(ApiResponse.ok("Discord 알림 설정 변경에 성공했습니다.", toBudget(result)));
    }

    @PatchMapping("/controls/rate-limit")
    @PreAuthorize("hasRole('ADMIN') and hasRole('MASTER')")
    public ResponseEntity<ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateRateLimit(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateRateLimit request,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        AiMetricsService.ResponseBudget result = aiMetricsService.updateRateLimit(
                new AiMetricsService.RequestUpdateRateLimit(request.rateLimitEnabled()),
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );
        return ResponseEntity.ok(ApiResponse.ok("AI rate limit 설정 변경에 성공했습니다.", toBudget(result)));
    }

    @GetMapping("/rag-documents")
    public ResponseEntity<ApiResponse<RagDocumentDTO.ResponseList>> getRagDocuments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        AiMetricsService.ResponseRagDocumentList result = aiMetricsService.getRagDocuments(page, size);
        RagDocumentDTO.ResponseList response = new RagDocumentDTO.ResponseList(
                result.content().stream()
                        .map(this::toRagDocumentItem)
                        .toList(),
                result.page(),
                result.size(),
                result.totalElements(),
                result.totalPages()
        );
        return ResponseEntity.ok(ApiResponse.ok("RAG 문서 목록 조회에 성공했습니다.", response));
    }

    @PostMapping("/rag-documents")
    public ResponseEntity<ApiResponse<RagDocumentDTO.ResponseDetail>> uploadRagDocument(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        AiMetricsService.ResponseRagDocumentDetail result = aiMetricsService.uploadRagDocument(
                file,
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );
        return ResponseEntity.ok(ApiResponse.ok("RAG 문서 업로드에 성공했습니다.", toRagDocumentDetail(result)));
    }

    @GetMapping("/rag-documents/{documentId}/download")
    public ResponseEntity<ApiResponse<RagDocumentDTO.ResponseDownload>> getRagDocumentDownload(
            @PathVariable Long documentId
    ) {
        AiMetricsService.ResponseRagDocumentDownload result = aiMetricsService.getRagDocumentDownload(documentId);
        RagDocumentDTO.ResponseDownload response = new RagDocumentDTO.ResponseDownload(
                result.ragDocumentId(),
                result.originalFileName(),
                result.fileUuid(),
                result.mimeType(),
                result.fileSize(),
                result.downloadUrl()
        );
        return ResponseEntity.ok(ApiResponse.ok("RAG 문서 다운로드 정보 조회에 성공했습니다.", response));
    }

    @DeleteMapping("/rag-documents/{documentId}")
    @PreAuthorize("hasRole('ADMIN') and hasRole('MASTER')")
    public ResponseEntity<ApiResponse<RagDocumentDTO.ResponseDelete>> deleteRagDocument(
            @PathVariable Long documentId,
            @AuthenticationPrincipal AuthPrincipal principal,
            HttpServletRequest httpServletRequest
    ) {
        AiMetricsService.ResponseRagDocumentDelete result = aiMetricsService.deleteRagDocument(
                documentId,
                AdminPrincipalResolver.extractAdminId(principal),
                AdminAuditClientIpExtractor.extract(httpServletRequest)
        );
        RagDocumentDTO.ResponseDelete response = new RagDocumentDTO.ResponseDelete(
                result.ragDocumentId(),
                result.deleted()
        );
        return ResponseEntity.ok(ApiResponse.ok("RAG 문서 삭제에 성공했습니다.", response));
    }

    private AiMetricsDTO.ResponseFeatureUsage toFeatureUsage(AiMetricsService.ResponseFeatureUsage result) {
        return new AiMetricsDTO.ResponseFeatureUsage(
                result.requestCount(),
                result.inputTokens(),
                result.outputTokens(),
                result.cost()
        );
    }

    private AiOpsSettingDTO.ResponseBudget toBudget(AiMetricsService.ResponseBudget result) {
        return new AiOpsSettingDTO.ResponseBudget(
                result.aiOpsSettingId(),
                result.selectedModelId(),
                result.monthlyBudget(),
                result.alertEnabled(),
                result.alertChannel(),
                result.alertThreshold(),
                result.rateLimitEnabled(),
                result.updatedAt()
        );
    }

    private RagDocumentDTO.ResponseItem toRagDocumentItem(AiMetricsService.ResponseRagDocumentItem result) {
        return new RagDocumentDTO.ResponseItem(
                result.ragDocumentId(),
                result.uploadedBy(),
                result.fileUuid(),
                result.originalFileName(),
                result.mimeType(),
                result.fileSize(),
                result.chunkCount(),
                result.indexingProgress(),
                result.status(),
                result.createdAt(),
                result.updatedAt()
        );
    }

    private RagDocumentDTO.ResponseDetail toRagDocumentDetail(AiMetricsService.ResponseRagDocumentDetail result) {
        return new RagDocumentDTO.ResponseDetail(
                result.ragDocumentId(),
                result.uploadedBy(),
                result.fileUuid(),
                result.originalFileName(),
                result.filePath(),
                result.mimeType(),
                result.fileSize(),
                result.chunkCount(),
                result.indexingProgress(),
                result.status(),
                result.createdAt(),
                result.updatedAt()
        );
    }

}
