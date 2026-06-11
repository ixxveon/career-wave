package kr.co.carrer.user.interview.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.interview.docs.InterviewReportControllerDocs;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.service.InterviewReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/interview/sessions")
public class InterviewReportController implements InterviewReportControllerDocs {

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
}
