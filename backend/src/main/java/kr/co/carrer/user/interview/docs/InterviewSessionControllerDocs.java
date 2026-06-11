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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Interview Session", description = "AI 면접 세션 API")
public interface InterviewSessionControllerDocs {

    @Operation(
            summary = "면접 세션 시작",
            description = "면접 세션을 생성하고 sessionId를 발급합니다. 세션 생성 후 Spring WebSocket 연결을 시작하세요.\n\n" +
                    "**Error cases**\n" +
                    "- 400: 유효하지 않은 sessionType\n" +
                    "- 401: 인증 토큰 없음 또는 만료\n" +
                    "- 404: 유효하지 않은 documentId\n" +
                    "- 409: 이미 IN_PROGRESS 세션 존재 (INTERVIEW_SESSION_DUPLICATE)"
    )
    ResponseEntity<ApiResponse<InterviewDTO.ResponseStartSession>> startSession(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody InterviewDTO.RequestStartSession dto
    );

    @Operation(
            summary = "텍스트 답변 제출",
            description = "텍스트 답변을 저장하고 FastAPI LLM 파이프라인을 트리거합니다.\n\n" +
                    "**Error cases**\n" +
                    "- 400: 입력값 검증 실패\n" +
                    "- 401: 인증 토큰 없음 또는 만료\n" +
                    "- 403: 본인 소유가 아닌 세션 (INTERVIEW_SESSION_FORBIDDEN)\n" +
                    "- 400: 이미 종료된 세션 (INTERVIEW_SESSION_ALREADY_ENDED)"
    )
    ResponseEntity<ApiResponse<InterviewDTO.ResponseSubmitTextAnswer>> submitTextAnswer(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable String sessionId,
            @RequestBody InterviewDTO.RequestSubmitTextAnswer dto
    );

    @Operation(
            summary = "음성 청크 제출",
            description = "음성 청크를 수신하고 FastAPI STT 파이프라인으로 비동기 전달합니다. multipart/form-data 형식으로 전송하세요.\n\n" +
                    "**허용 포맷**: audio/webm, audio/mp4, audio/ogg (청크당 최대 5MB)\n\n" +
                    "**Error cases**\n" +
                    "- 400: 지원하지 않는 오디오 포맷 (INTERVIEW_INVALID_AUDIO_FORMAT)\n" +
                    "- 400: 이미 종료된 세션 (INTERVIEW_SESSION_ALREADY_ENDED)\n" +
                    "- 401: 인증 토큰 없음 또는 만료\n" +
                    "- 403: 본인 소유가 아닌 세션 (INTERVIEW_SESSION_FORBIDDEN)"
    )
    ResponseEntity<ApiResponse<InterviewDTO.ResponseSubmitVoiceChunk>> submitVoiceChunk(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable String sessionId,
            @Parameter(description = "오디오 청크 파일") @RequestParam MultipartFile audioChunk,
            @Parameter(description = "질문 순서 (1-based)") @RequestParam int questionOrder,
            @Parameter(description = "청크 인덱스 (0-based)") @RequestParam int chunkIndex,
            @Parameter(description = "마지막 청크 여부") @RequestParam boolean isFinal
    );

    @Operation(
            summary = "면접 세션 종료",
            description = "면접 세션을 종료하고 FastAPI 리포트 생성을 트리거합니다. 멱등성 보장 — 이미 종료된 세션은 400 반환.\n\n" +
                    "**Error cases**\n" +
                    "- 400: 이미 종료된 세션 (INTERVIEW_SESSION_ALREADY_ENDED)\n" +
                    "- 401: 인증 토큰 없음 또는 만료\n" +
                    "- 403: 본인 소유가 아닌 세션 (INTERVIEW_SESSION_FORBIDDEN)"
    )
    ResponseEntity<ApiResponse<InterviewDTO.ResponseEndSession>> endSession(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable String sessionId
    );
}
