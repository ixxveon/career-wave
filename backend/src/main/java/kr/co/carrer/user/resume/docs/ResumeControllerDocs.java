package kr.co.carrer.user.resume.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Tag(name = "Resume", description = "서류 분석 API")
public interface ResumeControllerDocs {

    // Swagger multipart/form-data 스키마용 내부 클래스
    class FileUploadRequest {
        @Schema(type = "string", format = "binary", description = "이력서 파일 (PDF·DOC·DOCX, 최대 10MB)")
        public MultipartFile file;
    }

    @Operation(
            summary = "이력서 업로드",
            description = "PDF·DOC·DOCX 이력서 파일을 업로드하고 AI 분석을 시작합니다. 최대 10MB."
    )
    @RequestBody(
            required = true,
            content = @Content(
                    mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                    schema = @Schema(implementation = FileUploadRequest.class)
            )
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "업로드 성공",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(value = """
                                    {
                                      "success": true,
                                      "statusCode": 200,
                                      "message": "이력서가 업로드되었습니다.",
                                      "data": {
                                        "documentId": "46f85686-eeb6-49b0-867f-e36908b5f0ed",
                                        "status": "UPLOADED",
                                        "fileUrl": "https://bucket.s3.ap-northeast-2.amazonaws.com/resumes/2026-06-10/uuid.pdf",
                                        "originalName": "이력서.pdf",
                                        "fileType": "RESUME",
                                        "createdAt": "2026-06-10T11:11:54.2581841+09:00"
                                      }
                                    }
                                    """)
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "파일 크기 초과 또는 형식 오류",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = {
                                    @ExampleObject(name = "파일 크기 초과", summary = "파일 크기 초과 (10MB 이상)", value = """
                                            {
                                              "success": false,
                                              "statusCode": 400,
                                              "message": "파일 크기가 최대 허용 용량(10MB)을 초과했습니다.",
                                              "data": null
                                            }
                                            """),
                                    @ExampleObject(name = "지원하지 않는 형식", summary = "지원하지 않는 파일 형식 (PDF·DOC·DOCX 외)", value = """
                                            {
                                              "success": false,
                                              "statusCode": 400,
                                              "message": "지원하지 않는 파일 형식입니다.",
                                              "data": null
                                            }
                                            """)
                            }
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "인증 필요",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(value = """
                                    {
                                      "success": false,
                                      "statusCode": 401,
                                      "message": "인증이 필요합니다.",
                                      "data": null
                                    }
                                    """)
                    )
            )
    })
    ResponseEntity<ApiResponse<ResumeDTO.ResponseUpload>> uploadResume(
            @Parameter(hidden = true) MultipartFile file
    );

    @Operation(
            summary = "자기소개서 제출",
            description = "자기소개서 문항·답변을 입력하고 AI 분석을 시작합니다. 문항 1~5개, 답변 최대 1000자."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "제출 성공",
                    content = @Content(schema = @Schema(implementation = ResumeDTO.ResponseCoverLetter.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "입력값 검증 실패"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    ResponseEntity<ApiResponse<ResumeDTO.ResponseCoverLetter>> submitCoverLetter(
            @Parameter(description = "자기소개서 제출 요청 body", required = true)
            ResumeDTO.RequestCoverLetter request
    );

    @Operation(
            summary = "분석 결과 조회",
            description = "documentId로 AI 분석 결과를 조회합니다. 분석 미완료 시 scores·feedbackDetails는 null로 반환됩니다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = ResumeDTO.ResponseFeedback.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "본인 소유가 아닌 문서 접근 (IDOR)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "존재하지 않는 documentId"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    ResponseEntity<ApiResponse<ResumeDTO.ResponseFeedback>> getFeedback(
            @Parameter(description = "문서 고유 ID (UUID)", required = true, example = "550e8400-e29b-41d4-a716-446655440000")
            UUID documentId
    );

    @Operation(
            summary = "서류 분석 이력 목록 조회",
            description = "본인이 제출한 이력서·자기소개서 목록을 최신순으로 페이징 조회합니다."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "조회 성공"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    ResponseEntity<ApiResponse<PaginationResponse<ResumeDTO.HistoryItem>>> getHistory(
            @Parameter(description = "페이지 번호 (0부터 시작)", example = "0") int page,
            @Parameter(description = "페이지 크기 (최대 50)", example = "10") int size
    );
}
