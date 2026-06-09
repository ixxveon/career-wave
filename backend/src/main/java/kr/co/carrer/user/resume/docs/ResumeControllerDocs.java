package kr.co.carrer.user.resume.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Resume", description = "서류 분석 API")
public interface ResumeControllerDocs {

    @Operation(
            summary = "이력서 업로드",
            description = "PDF·DOC·DOCX 이력서 파일을 업로드하고 AI 분석을 시작합니다. 최대 10MB."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "업로드 성공",
                    content = @Content(schema = @Schema(implementation = ResumeDTO.ResponseUpload.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "파일 크기 초과 또는 형식 오류"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    ResponseEntity<ApiResponse<ResumeDTO.ResponseUpload>> uploadResume(
            @Parameter(description = "업로드할 이력서 파일 (PDF·DOC·DOCX, 최대 10MB)", required = true)
            MultipartFile file
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
}
