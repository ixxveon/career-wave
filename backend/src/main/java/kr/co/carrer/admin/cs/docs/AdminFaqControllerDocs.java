package kr.co.carrer.admin.cs.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin FAQ", description = "FAQ 관리 API")
public interface AdminFaqControllerDocs {

    @Operation(summary = "FAQ 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<FaqDTO.ResponseList>>> getFaqs(
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "FAQ 등록")
    ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> createFaq(
        @RequestBody @Valid FaqDTO.RequestCreate dto,
        @Parameter(hidden = true) Long adminId
    );

    @Operation(summary = "FAQ 수정")
    ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> updateFaq(
        @PathVariable Long faqId,
        @RequestBody @Valid FaqDTO.RequestUpdate dto
    );

    @Operation(summary = "FAQ 삭제")
    ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable Long faqId);
}
