package kr.co.carrer.user.resume.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.resume.docs.ResumeControllerDocs;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/user/resume")
@RequiredArgsConstructor
public class ResumeController implements ResumeControllerDocs {

    private final ResumeService resumeService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseUpload>> uploadResume(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        ResumeDTO.ResponseUpload response = resumeService.uploadResume(memberId, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("이력서가 업로드되었습니다.", response));
    }

    @PostMapping("/cover-letter")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseCoverLetter>> submitCoverLetter(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ResumeDTO.RequestCoverLetter request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        ResumeDTO.ResponseCoverLetter response = resumeService.submitCoverLetter(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("자기소개서가 제출되었습니다.", response));
    }

    @GetMapping("/{documentId}/feedback")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseFeedback>> getFeedback(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID documentId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        ResumeDTO.ResponseFeedback response = resumeService.getFeedback(memberId, documentId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PaginationResponse<ResumeDTO.HistoryItem>>> getHistory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        PaginationResponse<ResumeDTO.HistoryItem> response = resumeService.getHistory(memberId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{documentId}/webhook")
    public ResponseEntity<ApiResponse<Void>> receiveWebhook(
            @PathVariable UUID documentId,
            @RequestHeader("X-Internal-Secret") String webhookSecret,
            @RequestBody ResumeDTO.RequestWebhook request
    ) {
        resumeService.receiveWebhook(webhookSecret, request);
        return ResponseEntity.ok(ApiResponse.ok("분석 결과가 처리되었습니다.", null));
    }
}
