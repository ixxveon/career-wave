package kr.co.carrer.admin.cs.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.docs.AdminAiControllerDocs;
import kr.co.carrer.admin.cs.dto.AiDTO;
import kr.co.carrer.admin.cs.service.AdminAiService;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('BACKEND'))")
@Validated
public class AdminAiController implements AdminAiControllerDocs {

    private final AdminAiService adminAiService;

    @PostMapping("/notice-draft")
    public ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateNoticeDraft(
        @RequestBody @Valid AiDTO.RequestNoticeDraft dto,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateNoticeDraft(dto, parseAdminId(principal))));
    }

    @PostMapping("/faq-draft")
    public ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateFaqDraft(
        @RequestBody @Valid AiDTO.RequestFaqDraft dto,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateFaqDraft(dto, parseAdminId(principal))));
    }

    @PostMapping("/inquiry-draft")
    public ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateInquiryDraft(
        @RequestBody @Valid AiDTO.RequestInquiryDraft dto,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateInquiryDraft(dto, parseAdminId(principal))));
    }

    private long parseAdminId(AuthPrincipal principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(principal.getId());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
    }
}
