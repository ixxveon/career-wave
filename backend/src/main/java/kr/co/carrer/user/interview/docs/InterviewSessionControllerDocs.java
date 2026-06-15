package kr.co.carrer.user.interview.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Interview Session", description = "AI 면접 세션 API")
public interface InterviewSessionControllerDocs {

    @Operation(summary = "면접 세션 시작",
            description = "면접 세션을 생성하고 sessionId를 발급합니다. 세션 생성 후 Spring WebSocket 연결을 시작하세요.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "세션 생성 성공"),
            @ApiResponse(responseCode = "400", description = "유효하지 않은 sessionType",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":400,"message":"유효하지 않은 면접 세션 타입입니다.","code":"INTERVIEW_INVALID_SESSION_TYPE","data":null}"""))),
            @ApiResponse(responseCode = "401", description = "인증 토큰 없음 또는 만료",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":401,"message":"인증이 필요합니다.","code":"UNAUTHORIZED","data":null}"""))),
            @ApiResponse(responseCode = "404", description = "유효하지 않은 documentId",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":404,"message":"해당 서류를 찾을 수 없습니다.","code":"INTERVIEW_DOCUMENT_NOT_FOUND","data":null}"""))),
            @ApiResponse(responseCode = "409", description = "이미 IN_PROGRESS 세션 존재",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":409,"message":"이미 진행 중인 면접 세션이 있습니다.","code":"INTERVIEW_SESSION_DUPLICATE","data":null}""")))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<InterviewDTO.ResponseStartSession>> startSession(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody InterviewDTO.RequestStartSession dto
    );

    @Operation(summary = "텍스트 답변 제출",
            description = "텍스트 답변을 저장하고 FastAPI LLM 파이프라인을 트리거합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "답변 제출 성공"),
            @ApiResponse(responseCode = "400", description = "입력값 검증 실패 또는 이미 종료된 세션",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":400,"message":"이미 종료된 면접 세션입니다.","code":"INTERVIEW_SESSION_ALREADY_ENDED","data":null}"""))),
            @ApiResponse(responseCode = "401", description = "인증 토큰 없음 또는 만료",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":401,"message":"인증이 필요합니다.","code":"UNAUTHORIZED","data":null}"""))),
            @ApiResponse(responseCode = "403", description = "본인 소유가 아닌 세션",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":403,"message":"본인 소유의 면접 세션만 접근할 수 있습니다.","code":"INTERVIEW_SESSION_FORBIDDEN","data":null}""")))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<InterviewDTO.ResponseSubmitTextAnswer>> submitTextAnswer(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable UUID sessionId,
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
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<InterviewDTO.ResponseSubmitVoiceChunk>> submitVoiceChunk(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable UUID sessionId,
            @Parameter(description = "오디오 청크 파일") @RequestParam MultipartFile audioChunk,
            @Parameter(description = "질문 순서 (1-based)") @RequestParam int questionOrder,
            @Parameter(description = "청크 인덱스 (0-based)") @RequestParam int chunkIndex,
            @Parameter(description = "마지막 청크 여부") @RequestParam boolean isFinal
    );

    @Operation(summary = "면접 세션 종료",
            description = "면접 세션을 종료하고 FastAPI 리포트 생성을 트리거합니다. 이미 종료된 세션은 400 반환.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "세션 종료 성공"),
            @ApiResponse(responseCode = "400", description = "이미 종료된 세션",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":400,"message":"이미 종료된 면접 세션입니다.","code":"INTERVIEW_SESSION_ALREADY_ENDED","data":null}"""))),
            @ApiResponse(responseCode = "401", description = "인증 토큰 없음 또는 만료",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":401,"message":"인증이 필요합니다.","code":"UNAUTHORIZED","data":null}"""))),
            @ApiResponse(responseCode = "403", description = "본인 소유가 아닌 세션",
                    content = @Content(examples = @ExampleObject(value = """
                            {"success":false,"statusCode":403,"message":"본인 소유의 면접 세션만 접근할 수 있습니다.","code":"INTERVIEW_SESSION_FORBIDDEN","data":null}""")))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<InterviewDTO.ResponseEndSession>> endSession(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
            @Parameter(description = "면접 세션 ID (UUID)") @PathVariable UUID sessionId
    );
}
