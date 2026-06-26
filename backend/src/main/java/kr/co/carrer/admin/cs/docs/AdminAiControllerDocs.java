package kr.co.carrer.admin.cs.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.dto.AiDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Admin AI", description = "AI 초안 생성 API")
public interface AdminAiControllerDocs {

    @Operation(summary = "공지 AI 초안 생성")
    ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateNoticeDraft(
        @RequestBody @Valid AiDTO.RequestNoticeDraft dto,
        @Parameter(hidden = true) AuthPrincipal principal
    );

    @Operation(summary = "FAQ AI 초안 생성")
    ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateFaqDraft(
        @RequestBody @Valid AiDTO.RequestFaqDraft dto,
        @Parameter(hidden = true) AuthPrincipal principal
    );

    @Operation(summary = "문의 AI 답변 초안 생성")
    ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateInquiryDraft(
        @RequestBody @Valid AiDTO.RequestInquiryDraft dto,
        @Parameter(hidden = true) AuthPrincipal principal
    );
}
