package kr.co.carrer.user.interview.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.BaseErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.interview.docs.InterviewReportControllerDocs;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.service.InterviewReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/interview/sessions")
public class InterviewReportController implements InterviewReportControllerDocs {

    private static final int REPORT_ESTIMATED_WAIT_SECONDS = 15;

    private final InterviewReportService interviewReportService;

    @Override
    @GetMapping("/{sessionId}/report")
    public ResponseEntity<ApiResponse<InterviewDTO.ResponseReport>> getReport(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable String sessionId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(interviewReportService.getReport(memberId, UUID.fromString(sessionId))));
    }

    // INTERVIEW_REPORT_NOT_READY는 data.status/estimatedWaitSeconds를 포함한 별도 응답 포맷 필요
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<?>> handleCustomException(CustomException e) {
        BaseErrorCode errorCode = e.getErrorCode();
        if (errorCode == InterviewErrorCode.INTERVIEW_REPORT_NOT_READY) {
            return ResponseEntity.status(errorCode.getStatus())
                    .body(ApiResponse.fail(
                            errorCode.getStatus().value(),
                            e.getMessage(),
                            Map.of("status", "ANALYZING", "estimatedWaitSeconds", REPORT_ESTIMATED_WAIT_SECONDS)
                    ));
        }
        return ResponseEntity.status(errorCode.getStatus())
                .body(ApiResponse.fail(errorCode.getStatus().value(), e.getMessage(), errorCode.name()));
    }
}
