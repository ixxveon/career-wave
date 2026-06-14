package kr.co.carrer.admin.cs.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.docs.AdminAiControllerDocs;
import kr.co.carrer.admin.cs.dto.AiDTO;
import kr.co.carrer.admin.cs.service.AdminAiService;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
        @RequestBody @Valid AiDTO.RequestNoticeDraft dto
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateNoticeDraft(dto)));
    }

    @PostMapping("/faq-draft")
    public ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateFaqDraft(
        @RequestBody @Valid AiDTO.RequestFaqDraft dto
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateFaqDraft(dto)));
    }

    @PostMapping("/inquiry-draft")
    public ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateInquiryDraft(
        @RequestBody @Valid AiDTO.RequestInquiryDraft dto
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminAiService.generateInquiryDraft(dto)));
    }
}
