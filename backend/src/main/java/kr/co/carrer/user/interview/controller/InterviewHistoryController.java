package kr.co.carrer.user.interview.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.docs.InterviewHistoryControllerDocs;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.service.InterviewHistoryService;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/interview")
public class InterviewHistoryController implements InterviewHistoryControllerDocs {

    private final InterviewHistoryService interviewHistoryService;

    @Override
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PaginationResponse<InterviewDTO.HistoryItem>>> getHistory(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Min(0) @RequestParam(defaultValue = "0") int page,
            @Min(1) @RequestParam(defaultValue = "10") int size
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(interviewHistoryService.getHistory(memberId, page, size)));
    }
}
