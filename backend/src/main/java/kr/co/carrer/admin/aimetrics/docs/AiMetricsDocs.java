package kr.co.carrer.admin.aimetrics.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.aimetrics.dto.AiMetricsDTO;
import kr.co.carrer.admin.aimetrics.dto.AiOpsSettingDTO;
import kr.co.carrer.admin.aimetrics.dto.AiUsageLogDTO;
import kr.co.carrer.admin.aimetrics.dto.RagDocumentDTO;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.IntervalType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Admin AI Metrics", description = "관리자 AI 사용량, 운영 정책, RAG 문서 관리 API")
@SecurityRequirement(name = "bearerAuth")
public interface AiMetricsDocs {

    String UNAUTHORIZED_EXAMPLE = "{\"success\":false,\"statusCode\":401,\"message\":\"인증 정보가 없습니다.\",\"code\":\"AUTH_UNAUTHENTICATED\",\"data\":null}";
    String FORBIDDEN_EXAMPLE = "{\"success\":false,\"statusCode\":403,\"message\":\"접근 권한이 없습니다.\",\"code\":\"AUTH_FORBIDDEN\",\"data\":null}";
    String BAD_REQUEST_EXAMPLE = "{\"success\":false,\"statusCode\":400,\"message\":\"요청 파라미터가 올바르지 않습니다.\",\"code\":\"BAD_REQUEST\",\"data\":null}";
    String NOT_FOUND_EXAMPLE = "{\"success\":false,\"statusCode\":404,\"message\":\"요청한 리소스를 찾을 수 없습니다.\",\"data\":null}";
    String CONFLICT_EXAMPLE = "{\"success\":false,\"statusCode\":409,\"message\":\"현재 상태에서는 요청을 처리할 수 없습니다.\",\"data\":null}";

    @Operation(summary = "AI 사용량 요약 조회", description = "MASTER 또는 BACKEND 관리자가 ai_usage_logs.created_at 기간 조건과 featureType 필터 기준으로 전체 요청 수, 토큰 수, 비용, 기능별 요청 수, 활성 모델 정보를 조회합니다. from/to는 ISO 8601 UTC 문자열을 사용합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI 사용량 요약 조회 성공", content = @Content(schema = @Schema(implementation = AiMetricsDTO.ResponseSummary.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 조회 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiMetricsDTO.ResponseSummary>> getSummary(
            @Parameter(description = "조회 시작 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String from,
            @Parameter(description = "조회 종료 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String to,
            @Parameter(description = "AI 기능 유형 필터, ai_usage_logs.feature_type 기준", schema = @Schema(allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"})) @RequestParam(required = false) AiFeatureType featureType
    );

    @Operation(summary = "도메인별 AI 사용량 조회", description = "ai_usage_logs.created_at 기간 조건 기준으로 문서와 면접 도메인별 요청 수, 토큰 수, 비용을 조회합니다. from/to는 ISO 8601 UTC 문자열을 사용합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "도메인별 AI 사용량 조회 성공", content = @Content(schema = @Schema(implementation = AiMetricsDTO.ResponseDomainUsage.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 조회 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiMetricsDTO.ResponseDomainUsage>> getDomainUsage(
            @Parameter(description = "조회 시작 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String from,
            @Parameter(description = "조회 종료 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String to
    );

    @Operation(summary = "토큰 사용 추이 조회", description = "ai_usage_logs.created_at 기간 조건과 featureType 필터 기준으로 토큰 사용량과 비용 추이를 HOURLY 또는 DAILY 단위로 조회합니다. from/to는 ISO 8601 UTC 문자열을 사용합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "토큰 사용 추이 조회 성공", content = @Content(schema = @Schema(implementation = AiMetricsDTO.ResponseTokenTrend.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 조회 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiMetricsDTO.ResponseTokenTrend>> getTokenTrend(
            @Parameter(description = "조회 시작 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String from,
            @Parameter(description = "조회 종료 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String to,
            @Parameter(description = "AI 기능 유형 필터, ai_usage_logs.feature_type 기준", schema = @Schema(allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"})) @RequestParam(required = false) AiFeatureType featureType,
            @Parameter(description = "집계 단위", required = true, schema = @Schema(allowableValues = {"HOURLY", "DAILY"})) @RequestParam IntervalType interval
    );

    @Operation(summary = "고사용 사용자 조회", description = "ai_usage_logs.created_at 기간 조건과 featureType 필터 기준으로 AI 사용량이 높은 사용자를 요청 수, 토큰 수, 비용 기준으로 조회합니다. from/to는 ISO 8601 UTC 문자열을 사용합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "고사용 사용자 목록 조회 성공", content = @Content(schema = @Schema(implementation = AiMetricsDTO.ResponseHeavyUsers.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 조회 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiMetricsDTO.ResponseHeavyUsers>> getHeavyUsers(
            @Parameter(description = "조회 시작 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String from,
            @Parameter(description = "조회 종료 일시, ISO 8601 UTC, ai_usage_logs.created_at 기준") @RequestParam(required = false) String to,
            @Parameter(description = "AI 기능 유형 필터, ai_usage_logs.feature_type 기준", schema = @Schema(allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"})) @RequestParam(required = false) AiFeatureType featureType,
            @Parameter(description = "상위 사용자 조회 건수, 1 이상") @RequestParam(required = false) Integer limit
    );

    @Operation(summary = "AI 사용 로그 목록 조회", description = "ai_usage_logs 기반 AI 사용 로그를 기능 유형과 1-based 페이지네이션 조건으로 조회합니다. audit_logs 기반 운영 이벤트 로그는 auditLog 도메인에서 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI 사용 로그 조회 성공", content = @Content(schema = @Schema(implementation = AiUsageLogDTO.ResponseList.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 페이지 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiUsageLogDTO.ResponseList>> getUsageLogs(
            @Parameter(description = "AI 기능 유형 필터, ai_usage_logs.feature_type 기준", schema = @Schema(allowableValues = {"DOCUMENT", "INTERVIEW", "ADMIN_CS", "ADMIN_REPORT"})) @RequestParam(required = false) AiFeatureType featureType,
            @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "AI 운영 설정 조회", description = "MASTER 또는 BACKEND 관리자가 ai_ops_settings 기준의 현재 운영 모델, 월 예산, 알림 설정, rate limit 설정을 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI 운영 설정 조회 성공", content = @Content(schema = @Schema(implementation = AiOpsSettingDTO.ResponseBudget.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "운영 설정 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiOpsSettingDTO.ResponseBudget>> getBudget();

    @Operation(summary = "AI 예산 및 임계치 수정", description = "MASTER 관리자가 selectedModelId, monthlyBudget, alertThreshold를 수정합니다. 변경 내용은 ai_ops_settings에 저장되고 FastAPI 실행 설정 동기화와 Audit Log 기록 대상입니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI 예산 및 임계치 수정 성공", content = @Content(schema = @Schema(implementation = AiOpsSettingDTO.ResponseBudget.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 예산 또는 임계치", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "운영 모델 또는 설정 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateBudget(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateBudget request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(summary = "Discord 알림 설정 변경", description = "MASTER 또는 BACKEND 관리자가 Discord 알림 활성 여부만 변경합니다. MVP에서는 Discord 채널만 지원하므로 요청은 alertEnabled 값만 받고 alertChannel은 DISCORD로 고정됩니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Discord 알림 설정 변경 성공", content = @Content(schema = @Schema(implementation = AiOpsSettingDTO.ResponseBudget.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "운영 설정 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateDiscordAlert(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateDiscordAlert request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(summary = "AI rate limit 설정 변경", description = "MASTER 관리자가 rateLimitEnabled 값으로 AI rate limit 활성 여부를 변경합니다. 변경 내용은 ai_ops_settings에 저장되고 FastAPI 실행 설정 동기화와 Audit Log 기록 대상입니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "AI rate limit 설정 변경 성공", content = @Content(schema = @Schema(implementation = AiOpsSettingDTO.ResponseBudget.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "운영 설정 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AiOpsSettingDTO.ResponseBudget>> updateRateLimit(
            @Valid @RequestBody AiOpsSettingDTO.RequestUpdateRateLimit request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(summary = "RAG 문서 목록 조회", description = "rag_documents 메타데이터, indexingProgress, status(UPLOADED, INDEXING, COMPLETED, FAILED)를 1-based 페이지네이션으로 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RAG 문서 목록 조회 성공", content = @Content(schema = @Schema(implementation = RagDocumentDTO.ResponseList.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 페이지 조건", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<RagDocumentDTO.ResponseList>> getRagDocuments(
            @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "RAG 문서 업로드", description = "multipart/form-data file 필드로 원본 문서를 업로드합니다. Spring Boot는 originalFileName, mimeType, fileSize, filePath를 rag_documents 메타데이터로 저장하고 FastAPI 비동기 인덱싱 시작을 호출합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RAG 문서 업로드 성공", content = @Content(schema = @Schema(implementation = RagDocumentDTO.ResponseDetail.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 파일 요청", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "409", description = "인덱싱 충돌 또는 실패", content = @Content(examples = @ExampleObject(value = CONFLICT_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<RagDocumentDTO.ResponseDetail>> uploadRagDocument(
            @Parameter(description = "업로드할 RAG 문서 원본 파일. multipart/form-data의 file 필드", required = true) @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(summary = "RAG 문서 다운로드 정보 조회", description = "documentId 기준으로 rag_documents 메타데이터와 다운로드 URL을 조회합니다. 문서가 없으면 RAG_DOCUMENT_NOT_FOUND 오류를 반환합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RAG 문서 다운로드 정보 조회 성공", content = @Content(schema = @Schema(implementation = RagDocumentDTO.ResponseDownload.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "RAG 문서 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<RagDocumentDTO.ResponseDownload>> getRagDocumentDownload(
            @Parameter(description = "RAG 문서 ID, rag_documents.rag_document_id 기준") @PathVariable Long documentId
    );

    @Operation(summary = "RAG 문서 삭제", description = "MASTER 관리자가 documentId 기준으로 RAG 문서 삭제를 요청합니다. Spring Boot는 RAG 메타데이터 삭제와 FastAPI 인덱스 제거 호출을 연동하고 삭제 결과를 Audit Log 기록 대상으로 처리합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RAG 문서 삭제 성공", content = @Content(schema = @Schema(implementation = RagDocumentDTO.ResponseDelete.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "RAG 문서 없음", content = @Content(examples = @ExampleObject(value = NOT_FOUND_EXAMPLE))),
            @ApiResponse(responseCode = "409", description = "RAG 문서 삭제 실패", content = @Content(examples = @ExampleObject(value = CONFLICT_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<RagDocumentDTO.ResponseDelete>> deleteRagDocument(
            @Parameter(description = "RAG 문서 ID, rag_documents.rag_document_id 기준") @PathVariable Long documentId,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );
}
