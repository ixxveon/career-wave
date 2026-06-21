package kr.co.carrer.admin.scraping.docs;

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
import kr.co.carrer.admin.scraping.dto.ScrapingLogDTO;
import kr.co.carrer.admin.scraping.dto.ScrapingPipelineDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Admin Scraping", description = "Admin scraping pipeline and execution log APIs")
@SecurityRequirement(name = "bearerAuth")
public interface ScrapingDocs {

    String UNAUTHORIZED_EXAMPLE = "{\"success\":false,\"statusCode\":401,\"message\":\"인증 정보가 없습니다.\",\"code\":\"AUTH_UNAUTHENTICATED\",\"data\":null}";
    String FORBIDDEN_EXAMPLE = "{\"success\":false,\"statusCode\":403,\"message\":\"접근 권한이 없습니다.\",\"code\":\"AUTH_FORBIDDEN\",\"data\":null}";
    String BAD_REQUEST_EXAMPLE = "{\"success\":false,\"statusCode\":400,\"message\":\"요청 파라미터가 올바르지 않습니다.\",\"code\":\"BAD_REQUEST\",\"data\":null}";
    String PIPELINE_NOT_FOUND_EXAMPLE = "{\"success\":false,\"statusCode\":404,\"message\":\"스크래핑 파이프라인을 찾을 수 없습니다.\",\"code\":\"SCRAPING_PIPELINE_NOT_FOUND\",\"data\":null}";
    String SOURCE_NOT_FOUND_EXAMPLE = "{\"success\":false,\"statusCode\":404,\"message\":\"지원하지 않는 스크래핑 소스입니다.\",\"code\":\"SCRAPING_SOURCE_NOT_FOUND\",\"data\":null}";
    String ALREADY_RUNNING_EXAMPLE = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 실행 중인 스크래핑 파이프라인입니다.\",\"code\":\"SCRAPING_ALREADY_RUNNING\",\"data\":null}";
    String EXECUTION_FAILED_EXAMPLE = "{\"success\":false,\"statusCode\":500,\"message\":\"스크래핑 실행 요청 처리에 실패했습니다.\",\"code\":\"SCRAPING_EXECUTION_FAILED\",\"data\":null}";
    String TEST_FAILED_EXAMPLE = "{\"success\":false,\"statusCode\":500,\"message\":\"스크래핑 테스트 실행에 실패했습니다.\",\"code\":\"SCRAPING_TEST_FAILED\",\"data\":null}";

    @Operation(
            summary = "스크래핑 파이프라인 목록 조회",
            description = "관리자 스크래핑 파이프라인 목록을 조회합니다. "
                    + "keyword, status, page, size 필터를 지원하며 page는 외부 API 기준 1-based로 동작합니다. "
                    + "내부적으로 FastAPI GET /internal/scraping/pipelines 호출 결과를 외부 ApiResponse 규격으로 변환합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "파이프라인 목록 조회 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingPipelineDTO.ResponsePipelinePage.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청",
                    content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingPipelineDTO.ResponsePipelinePage>> getPipelines(
            @Valid @ModelAttribute ScrapingPipelineDTO.RequestList request
    );

    @Operation(
            summary = "스크래핑 파이프라인 요약 조회",
            description = "전체 파이프라인 수와 상태별 개수를 요약 조회합니다. "
                    + "내부적으로 FastAPI GET /internal/scraping/pipelines/summary 결과를 외부 ApiResponse 규격으로 변환합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "파이프라인 요약 조회 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingPipelineDTO.ResponseSummary.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingPipelineDTO.ResponseSummary>> getSummary();

    @Operation(
            summary = "스크래핑 파이프라인 상세 조회",
            description = "sourceName 기준으로 단일 스크래핑 파이프라인 상세 정보를 조회합니다. "
                    + "내부적으로 FastAPI GET /internal/scraping/pipelines/{sourceName} 결과를 외부 ApiResponse 규격으로 변환하며, "
                    + "미지원 sourceName 또는 미존재 파이프라인은 scraping 도메인 ErrorCode로 변환합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "파이프라인 상세 조회 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingPipelineDTO.ResponseDetail.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "파이프라인 없음",
                    content = @Content(examples = @ExampleObject(value = PIPELINE_NOT_FOUND_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingPipelineDTO.ResponseDetail>> getPipelineDetail(
            @Parameter(description = "스크래핑 sourceName") @PathVariable String sourceName
    );

    @Operation(
            summary = "스크래핑 파이프라인 액션 요청",
            description = "sourceName 기준 단일 파이프라인에 대해 RUN, RETRY, TEST 액션을 요청합니다. "
                    + "요청 본문의 actionType에 따라 FastAPI 내부 /run, /retry, /test 경로로 위임됩니다. "
                    + "FastAPI 오류는 SCRAPING_SOURCE_NOT_FOUND, SCRAPING_ALREADY_RUNNING, "
                    + "SCRAPING_EXECUTION_FAILED, SCRAPING_TEST_FAILED 중 하나로 변환됩니다. "
                    + "외부 요청이 수락되면 관리자 액션 감사 로그를 SCRAPING_SYSTEM 유형으로 1건 기록합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "액션 요청 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingPipelineDTO.ResponseAction.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청",
                    content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "404", description = "지원하지 않는 소스",
                    content = @Content(examples = @ExampleObject(value = SOURCE_NOT_FOUND_EXAMPLE))),
            @ApiResponse(responseCode = "409", description = "이미 실행 중",
                    content = @Content(examples = @ExampleObject(value = ALREADY_RUNNING_EXAMPLE))),
            @ApiResponse(responseCode = "500", description = "실행 또는 테스트 실패",
                    content = @Content(examples = {
                            @ExampleObject(name = "executionFailed", value = EXECUTION_FAILED_EXAMPLE),
                            @ExampleObject(name = "testFailed", value = TEST_FAILED_EXAMPLE)
                    }))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingPipelineDTO.ResponseAction>> requestAction(
            @Parameter(description = "스크래핑 sourceName") @PathVariable String sourceName,
            @Valid @RequestBody ScrapingPipelineDTO.RequestAction request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(
            summary = "스크래핑 파이프라인 배치 액션 요청",
            description = "여러 파이프라인에 대해 배치 액션을 요청합니다. "
                    + "현재 배치 액션은 FastAPI 내부 POST /internal/scraping/pipelines/batch-run 계약으로 위임됩니다. "
                    + "FastAPI 내부 오류는 SCRAPING_EXECUTION_FAILED로 변환됩니다. "
                    + "외부 요청이 수락되면 배치 요청 단위의 관리자 액션 감사 로그를 SCRAPING_SYSTEM 유형으로 1건 기록합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "배치 액션 요청 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingPipelineDTO.ResponseBatchAction.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청",
                    content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))),
            @ApiResponse(responseCode = "500", description = "실행 실패",
                    content = @Content(examples = @ExampleObject(value = EXECUTION_FAILED_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingPipelineDTO.ResponseBatchAction>> requestBatchAction(
            @Valid @RequestBody ScrapingPipelineDTO.RequestBatchAction request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(
            summary = "스크래핑 실행 로그 조회",
            description = "스크래핑 실행 로그를 조회합니다. "
                    + "sourceName, status, page, size 필터를 지원하며 page는 외부 API 기준 1-based로 동작합니다. "
                    + "내부적으로 FastAPI GET /internal/scraping/logs 호출 결과를 외부 ApiResponse 규격으로 변환합니다."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "실행 로그 조회 성공",
                    content = @Content(schema = @Schema(implementation = ScrapingLogDTO.ResponseLogPage.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청",
                    content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))),
            @ApiResponse(responseCode = "401", description = "인증 필요",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
            @ApiResponse(responseCode = "403", description = "권한 없음",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<ScrapingLogDTO.ResponseLogPage>> getLogs(
            @Valid @ModelAttribute ScrapingLogDTO.RequestList request
    );
}
