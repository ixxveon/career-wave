package kr.co.carrer.user.careerhistory.docs;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

public interface UserCareerHistoryControllerDocs {

    ResponseEntity<ApiResponse<PaginationResponse<UserCareerHistoryResponse>>> getHistories(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    );

    ResponseEntity<ApiResponse<UserCareerHistoryDetailResponse>> getHistoryDetail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable UUID sessionId
    );
}