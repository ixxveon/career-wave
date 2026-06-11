package kr.co.carrer.admin.cs.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.docs.AdminFaqControllerDocs;
import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.service.AdminFaqService;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/faqs")
@RequiredArgsConstructor
@Validated
public class AdminFaqController implements AdminFaqControllerDocs {

    private final AdminFaqService adminFaqService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<FaqDTO.ResponseList>>> getFaqs(
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        FaqCategory cat = parseEnum(FaqCategory.class, category);
        return ResponseEntity.ok(ApiResponse.ok(adminFaqService.getFaqs(cat, page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> createFaq(
        @RequestBody @Valid FaqDTO.RequestCreate dto,
        @AuthenticationPrincipal Long adminId
    ) {
        if (adminId == null) throw new CustomException(ErrorCode.UNAUTHORIZED);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(adminFaqService.createFaq(dto, adminId)));
    }

    @PutMapping("/{faqId}")
    public ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> updateFaq(
        @PathVariable Long faqId,
        @RequestBody @Valid FaqDTO.RequestUpdate dto
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminFaqService.updateFaq(faqId, dto)));
    }

    @DeleteMapping("/{faqId}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable Long faqId) {
        adminFaqService.deleteFaq(faqId);
        return ResponseEntity.ok(ApiResponse.ok("FAQ가 삭제되었습니다."));
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
