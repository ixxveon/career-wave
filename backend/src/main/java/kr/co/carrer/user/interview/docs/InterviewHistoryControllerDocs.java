package kr.co.carrer.user.interview.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "User Interview History", description = "AI 면접 이력 API")
public interface InterviewHistoryControllerDocs {

    @Operation(
            summary = "면접 이력 목록 조회",
            description = "본인의 면접 이력을 최신순으로 페이징 조회합니다.\n\n" +
                    "- `career_histories` 기반 조회, `interview_sessions` JOIN으로 세션 정보 취득\n" +
                    "- 본인(`member_id`) 기록만 반환\n\n" +
                    "**Error cases**\n" +
                    "- 401: 인증 토큰 없음 또는 만료"
    )
    ResponseEntity<ApiResponse<PaginationResponse<InterviewDTO.HistoryItem>>> getHistory(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "페이지 번호 (0-based)", example = "0") @Min(0) @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기", example = "10") @Min(1) @RequestParam(defaultValue = "10") int size
    );
}
