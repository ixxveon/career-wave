package kr.co.carrer.admin.cs.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.docs.AdminInquiryControllerDocs;
import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.service.AdminInquiryService;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/inquiries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('CS'))")
@Validated
public class AdminInquiryController implements AdminInquiryControllerDocs {

    private final AdminInquiryService adminInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<InquiryDTO.ResponseList>>> getInquiries(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        InquiryCategory cat = parseEnum(InquiryCategory.class, category);
        InquiryStatus st   = parseEnum(InquiryStatus.class, status);
        return ResponseEntity.ok(ApiResponse.ok(adminInquiryService.getInquiries(cat, st, page, size)));
    }

    @GetMapping("/{inquiryId}")
    public ResponseEntity<ApiResponse<InquiryDTO.ResponseDetail>> getInquiryDetail(@PathVariable Long inquiryId) {
        return ResponseEntity.ok(ApiResponse.ok(adminInquiryService.getInquiryDetail(inquiryId)));
    }

    @PutMapping("/{inquiryId}/reply")
    public ResponseEntity<ApiResponse<InquiryDTO.ResponseReply>> saveReply(
        @PathVariable Long inquiryId,
        @RequestBody @Valid InquiryDTO.RequestReply dto,
        @AuthenticationPrincipal Long adminId
    ) {
        if (adminId == null) throw new CustomException(ErrorCode.UNAUTHORIZED);
        return ResponseEntity.ok(ApiResponse.ok(
            adminInquiryService.saveReply(inquiryId, dto.reply(), adminId)
        ));
    }

    @PutMapping("/{inquiryId}/complete")
    public ResponseEntity<ApiResponse<InquiryDTO.ResponseComplete>> completeInquiry(
        @PathVariable Long inquiryId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminInquiryService.completeInquiry(inquiryId)));
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
