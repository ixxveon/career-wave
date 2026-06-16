package kr.co.carrer.user.interview.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.interview.docs.InterviewSessionControllerDocs;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.service.InterviewSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/interview/sessions")
public class InterviewSessionController implements InterviewSessionControllerDocs {

    private final InterviewSessionService interviewSessionService;

    @Override
    @PostMapping
    public ResponseEntity<ApiResponse<InterviewDTO.ResponseStartSession>> startSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody @Valid InterviewDTO.RequestStartSession dto
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(interviewSessionService.startSession(memberId, dto)));
    }

    @Override
    @PostMapping("/{sessionId}/answer/text")
    public ResponseEntity<ApiResponse<InterviewDTO.ResponseSubmitTextAnswer>> submitTextAnswer(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID sessionId,
            @RequestBody @Valid InterviewDTO.RequestSubmitTextAnswer dto
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                interviewSessionService.submitTextAnswer(memberId, sessionId, dto)
        ));
    }

    @Override
    @PostMapping(value = "/{sessionId}/answer/voice", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<InterviewDTO.ResponseSubmitVoiceChunk>> submitVoiceChunk(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID sessionId,
            @RequestParam MultipartFile audioChunk,
            @RequestParam @Min(1) int questionOrder,
            @RequestParam @Min(0) int chunkIndex,
            @RequestParam boolean isFinal
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, questionOrder, chunkIndex, isFinal)
        ));
    }

    @Override
    @PostMapping("/{sessionId}/end")
    public ResponseEntity<ApiResponse<InterviewDTO.ResponseEndSession>> endSession(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID sessionId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                interviewSessionService.endSession(memberId, sessionId)
        ));
    }
}
