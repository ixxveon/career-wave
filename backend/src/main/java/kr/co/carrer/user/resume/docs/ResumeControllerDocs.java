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
import kr.co.carrer.user.resume.dto.ResumeDTO;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

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
                                    @ExampleObject(name = "파일 크기 초과", value = """
                                            {
                                              "success": false,
                                              "statusCode": 400,
                                              "message": "파일 크기가 최대 허용 용량(10MB)을 초과했습니다.",
                                              "data": null
                                            }
                                            """),
                                    @ExampleObject(name = "지원하지 않는 형식", value = """
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
}
