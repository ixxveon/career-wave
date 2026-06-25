package kr.co.carrer.user.careerhistory.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.careerhistory.docs.UserCareerHistoryControllerDocs;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryResponse;
import kr.co.carrer.user.careerhistory.service.UserCareerHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/career-histories")
public class UserCareerHistoryController implements UserCareerHistoryControllerDocs {

    private final UserCareerHistoryService userCareerHistoryService;

    public UserCareerHistoryController(UserCareerHistoryService userCareerHistoryService) {
        this.userCareerHistoryService = userCareerHistoryService;
    }

    @Override
    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<UserCareerHistoryResponse>>> getHistories(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        UUID memberId = UUID.fromString(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.ok(userCareerHistoryService.getHistories(memberId, page, size))
        );
    }

    @Override
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<UserCareerHistoryDetailResponse>> getHistoryDetail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID sessionId
    ) {
        UUID memberId = UUID.fromString(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.ok(userCareerHistoryService.getHistoryDetail(memberId, sessionId))
        );
    }
}