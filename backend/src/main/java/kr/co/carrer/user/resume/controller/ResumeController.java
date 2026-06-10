package kr.co.carrer.user.resume.controller;

import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.resume.docs.ResumeControllerDocs;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.validation.annotation.Validated;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/user/resume")
@RequiredArgsConstructor
public class ResumeController implements ResumeControllerDocs {

    private final ResumeService resumeService; // ResumeServiceImpl 주입

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseUpload>> uploadResume(
            @RequestParam("file") MultipartFile file
    ) {
        // TODO: JWT 연동 완료 후 @AuthenticationPrincipal로 memberId 추출
        UUID tempMemberId = UUID.fromString("00000000-0000-0000-0000-000000000001");

        ResumeDTO.ResponseUpload response = resumeService.uploadResume(tempMemberId, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("이력서가 업로드되었습니다.", response));
    }

    @PostMapping("/cover-letter")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseCoverLetter>> submitCoverLetter(
            @RequestBody ResumeDTO.RequestCoverLetter request
    ) {
        // TODO: JWT 연동 완료 후 @AuthenticationPrincipal로 memberId 추출
        UUID tempMemberId = UUID.fromString("00000000-0000-0000-0000-000000000001");

        ResumeDTO.ResponseCoverLetter response = resumeService.submitCoverLetter(tempMemberId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("자기소개서가 제출되었습니다.", response));
    }

    @GetMapping("/{documentId}/feedback")
    public ResponseEntity<ApiResponse<ResumeDTO.ResponseFeedback>> getFeedback(
            @PathVariable UUID documentId
    ) {
        // TODO: JWT 연동 완료 후 @AuthenticationPrincipal로 memberId 추출
        UUID tempMemberId = UUID.fromString("00000000-0000-0000-0000-000000000001");

        ResumeDTO.ResponseFeedback response = resumeService.getFeedback(tempMemberId, documentId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PaginationResponse<ResumeDTO.HistoryItem>>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        // TODO: JWT 연동 완료 후 @AuthenticationPrincipal로 memberId 추출
        UUID tempMemberId = UUID.fromString("00000000-0000-0000-0000-000000000001");

        PaginationResponse<ResumeDTO.HistoryItem> response = resumeService.getHistory(tempMemberId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<Void>> receiveWebhook(
            @RequestHeader("X-Internal-Secret") String webhookSecret,
            @RequestBody ResumeDTO.RequestWebhook request
    ) {
        resumeService.receiveWebhook(webhookSecret, request);
        return ResponseEntity.ok(ApiResponse.ok("분석 결과가 처리되었습니다.", null));
    }
}
