package kr.co.carrer.admin.cs.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Inquiry", description = "1:1 문의 관리 API")
public interface AdminInquiryControllerDocs {

    @Operation(summary = "문의 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<InquiryDTO.ResponseList>>> getInquiries(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "문의 상세 조회")
    ResponseEntity<ApiResponse<InquiryDTO.ResponseDetail>> getInquiryDetail(@PathVariable Long inquiryId);

    @Operation(summary = "답변 저장")
    ResponseEntity<ApiResponse<InquiryDTO.ResponseReply>> saveReply(
        @PathVariable Long inquiryId,
        @RequestBody @Valid InquiryDTO.RequestReply dto,
        Long adminId
    );

    @Operation(summary = "처리 완료")
    ResponseEntity<ApiResponse<InquiryDTO.ResponseComplete>> completeInquiry(@PathVariable Long inquiryId);
}
