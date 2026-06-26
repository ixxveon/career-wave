package kr.co.carrer.user.interview.controller;

import lombok.extern.slf4j.Slf4j;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.service.InterviewCallbackService;
import kr.co.carrer.user.interview.service.InterviewSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import org.springframework.web.bind.annotation.RequestParam;


@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/internal/api/v1/interview/callback")
public class InterviewCallbackController {

    private final InterviewCallbackService interviewCallbackService;
    private final InterviewSessionService interviewSessionService;

    @Value("${interview.internal-secret}")
    private String internalSecret;

    @PostMapping("/{sessionId}/question")
    public ResponseEntity<ApiResponse<Void>> receiveQuestionCallback(
            @RequestHeader("X-Internal-Secret") String secret,
            @PathVariable UUID sessionId,
            @RequestBody InterviewDTO.RequestQuestionCallback dto
    ) {
        if (!MessageDigest.isEqual(
                internalSecret.getBytes(StandardCharsets.UTF_8),
                secret.getBytes(StandardCharsets.UTF_8))) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_CALLBACK_UNAUTHORIZED);
        }

        interviewCallbackService.processQuestionCallback(sessionId, dto);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{sessionId}/verify")
    public ResponseEntity<ApiResponse<Void>> verifySessionOwnership(
            @RequestHeader("X-Internal-Secret") String secret,
            @PathVariable UUID sessionId,
            @RequestParam UUID memberId
    ) {
        if (!MessageDigest.isEqual(
                internalSecret.getBytes(StandardCharsets.UTF_8),
                secret.getBytes(StandardCharsets.UTF_8))) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_CALLBACK_UNAUTHORIZED);
        }
        interviewSessionService.verifySessionOwnership(memberId, sessionId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{sessionId}/report")
    public ResponseEntity<ApiResponse<Void>> receiveReportCallback(
            @RequestHeader("X-Internal-Secret") String secret,
            @PathVariable UUID sessionId,
            @RequestBody InterviewDTO.RequestReportCallback dto
    ) {
        if (!MessageDigest.isEqual(
                internalSecret.getBytes(StandardCharsets.UTF_8),
                secret.getBytes(StandardCharsets.UTF_8))) {
            throw new CustomException(InterviewErrorCode.INTERVIEW_CALLBACK_UNAUTHORIZED);
        }

        interviewCallbackService.processReportCallback(sessionId, dto);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
