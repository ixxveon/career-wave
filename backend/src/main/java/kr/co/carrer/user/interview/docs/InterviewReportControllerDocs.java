package kr.co.carrer.user.interview.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@Tag(name = "User Interview Report", description = "AI 면접 리포트 API")
public interface InterviewReportControllerDocs {

    @Operation(
            summary = "면접 리포트 조회",
            description = "면접 세션의 질문별 피드백 리포트를 조회합니다.\n\n" +
                    "`voiceQualityRatio < 50.00`인 항목의 `deliveryScore` / `fluencyScore`는 null로 반환됩니다.\n\n" +
                    "**Error cases**\n" +
                    "- 401: 인증 토큰 없음 또는 만료\n" +
                    "- 403: 존재하지 않는 sessionId 또는 본인 소유가 아닌 세션 (INTERVIEW_SESSION_FORBIDDEN) — IDOR 방어\n" +
                    "- 409: 리포트 생성 중 (INTERVIEW_REPORT_NOT_READY)"
    )
    ResponseEntity<ApiResponse<InterviewDTO.ResponseReport>> getReport(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable UUID sessionId
    );
}
