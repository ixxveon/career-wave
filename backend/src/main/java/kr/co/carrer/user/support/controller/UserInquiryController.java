package kr.co.carrer.user.support.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.docs.UserInquiryControllerDocs;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.service.UserInquiryService;
import kr.co.carrer.user.support.type.InquiryCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/user/inquiries")
@RequiredArgsConstructor
public class UserInquiryController implements UserInquiryControllerDocs {

    private final UserInquiryService userInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<SupportDTO.InquiryList>>> getMyInquiries(
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        InquiryCategory cat = parseEnum(InquiryCategory.class, category);
        return ResponseEntity.ok(ApiResponse.ok(userInquiryService.getMyInquiries(memberId, cat, page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportDTO.ResponseCreateInquiry>> createInquiry(
        @RequestBody @Valid SupportDTO.RequestCreateInquiry dto,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("문의가 접수되었습니다.", userInquiryService.createInquiry(memberId, dto)));
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
