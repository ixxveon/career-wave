package kr.co.carrer.user.interview.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

public class InterviewDTO {

    @Schema(description = "면접 세션 시작 요청")
    public record RequestStartSession(

            @Schema(description = "RAG 컨텍스트용 서류 ID (없으면 일반 면접 진행)", example = "550e8400-e29b-41d4-a716-446655440000")
            String documentId,

            @NotBlank
            @Schema(description = "면접 세션 타입", allowableValues = {"TEXT", "VOICE", "VIDEO"})
            String sessionType,

            @Schema(description = "면접 유형", allowableValues = {"TECHNICAL", "PERSONALITY", "PROJECT"})
            String interviewType,

            @Size(max = 100)
            @Schema(description = "준비 대상 기업명 (최대 100자)", example = "카카오")
            String targetCompany
    ) {}

    @Schema(description = "면접 세션 시작 응답")
    public record ResponseStartSession(

            @Schema(description = "면접 세션 ID (UUID)")
            String sessionId,

            @Schema(description = "세션 상태", example = "IN_PROGRESS")
            String sessionStatus,

            @Schema(description = "세션 타입", example = "VOICE")
            String sessionType,

            @Schema(description = "연결된 서류 ID (없으면 null)")
            String documentId,

            @Schema(description = "세션 생성 일시 (ISO 8601)")
            ZonedDateTime createdAt
    ) {}

    @Schema(description = "텍스트 답변 제출 요청")
    public record RequestSubmitTextAnswer(

            @NotNull
            @Min(1)
            @Schema(description = "현재 답변 중인 질문 순서 (1~N)", example = "1")
            Integer questionOrder,

            @NotBlank
            @Schema(description = "텍스트 답변 본문", example = "저는 Java와 Spring Boot를 주로 사용합니다.")
            String messageContent
    ) {}

    @Schema(description = "텍스트 답변 제출 응답")
    public record ResponseSubmitTextAnswer(

            @Schema(description = "저장된 메시지 ID")
            Long messageId,

            @Schema(description = "메시지 저장 일시 (ISO 8601)")
            ZonedDateTime createdAt
    ) {}

    @Schema(description = "음성 청크 제출 응답")
    public record ResponseSubmitVoiceChunk(

            @Schema(description = "수신된 청크 인덱스 (0-based)")
            Integer chunkIndex,

            @Schema(description = "수신 성공 여부")
            boolean received
    ) {}

    @Schema(description = "면접 세션 종료 응답")
    public record ResponseEndSession(

            @Schema(description = "면접 세션 ID (UUID)")
            String sessionId,

            @Schema(description = "세션 상태", example = "COMPLETED")
            String sessionStatus,

            @Schema(description = "세션 종료 일시 (ISO 8601)")
            ZonedDateTime endedAt
    ) {}

    @Schema(description = "피드백 항목 (리포트용)")
    public record FeedbackItem(

            @Schema(description = "질문 순서 (1-based)")
            Integer questionOrder,

            @Schema(description = "질문 본문")
            String questionText,

            @Schema(description = "답변 본문 (STT 변환 결과 포함)")
            String answerText,

            @Schema(description = "직무 연관성 점수 (0~100)")
            Integer relevanceScore,

            @Schema(description = "답변 깊이 점수 (0~100)")
            Integer depthScore,

            @Schema(description = "전달력 점수 — 텍스트 면접 또는 음성 품질 미달 시 null")
            Integer deliveryScore,

            @Schema(description = "유창성 점수 — 텍스트 면접 또는 음성 품질 미달 시 null")
            Integer fluencyScore,

            @Schema(description = "음성 인식 유효 비율 (0.00~100.00) — 텍스트 면접 시 null")
            BigDecimal voiceQualityRatio,

            @Schema(description = "질문별 AI 피드백")
            String aiFeedback,

            @Schema(description = "피드백 생성 일시 (ISO 8601)")
            ZonedDateTime createdAt
    ) {}

    @Schema(description = "면접 리포트 조회 응답")
    public record ResponseReport(

            @Schema(description = "면접 세션 ID (UUID)")
            String sessionId,

            @Schema(description = "세션 상태", example = "COMPLETED")
            String sessionStatus,

            @Schema(description = "세션 타입", example = "VOICE")
            String sessionType,

            @Schema(description = "면접 종합 점수 (0~100), 리포트 미완료 시 null")
            Integer totalScore,

            @Schema(description = "질문별 피드백 목록")
            List<FeedbackItem> feedbacks,

            @Schema(description = "세션 생성 일시 (ISO 8601)")
            ZonedDateTime createdAt
    ) {}

    @Schema(description = "면접 이력 목록 항목")
    public record HistoryItem(

            @Schema(description = "이력 고유 식별자")
            Long careerHistoryId,

            @Schema(description = "면접 세션 ID (UUID)")
            String sessionId,

            @Schema(description = "세션 타입", allowableValues = {"TEXT", "VOICE", "VIDEO"})
            String sessionType,

            @Schema(description = "면접 유형 (미입력 시 null)", allowableValues = {"TECHNICAL", "PERSONALITY", "PROJECT"})
            String interviewType,

            @Schema(description = "준비 대상 기업명 (미입력 시 null)")
            String targetCompany,

            @Schema(description = "세션 상태", allowableValues = {"IN_PROGRESS", "COMPLETED", "FAILED"})
            String sessionStatus,

            @Schema(description = "면접 종합 점수 (리포트 미완료 또는 FAILED 시 null)")
            Integer totalScore,

            @Schema(description = "종합 진단 PDF URL (미생성 시 null)")
            String pdfUrl,

            @Schema(description = "이력 생성 일시 (ISO 8601)")
            ZonedDateTime createdAt
    ) {}

    @Schema(description = "리포트 미완료 409 응답 데이터")
    public record ResponseReportNotReady(

            @Schema(description = "분석 상태", example = "ANALYZING")
            String status,

            @Schema(description = "예상 대기 시간 (초)", example = "15")
            int estimatedWaitSeconds
    ) {}

    @Schema(description = "FastAPI 질문 콜백 요청")
    public record RequestQuestionCallback(

            @Schema(description = "질문 순서 (1-based)")
            Integer questionOrder,

            @Schema(description = "질문 본문")
            String questionText,

            @Schema(description = "질문 유형 (FOLLOW_UP | PRESSURE | NEXT)")
            String questionType
    ) {}

    @Schema(description = "FastAPI 리포트 콜백 요청")
    public record RequestReportCallback(

            @Schema(description = "면접 세션 ID")
            String sessionId,

            @Schema(description = "면접 종합 점수")
            Integer totalScore,

            @Schema(description = "질문별 피드백 목록")
            List<CallbackFeedbackItem> feedbacks
    ) {}

    @Schema(description = "FastAPI 콜백 피드백 항목")
    public record CallbackFeedbackItem(
            Integer questionOrder,
            String questionText,
            String answerText,
            Integer relevanceScore,
            Integer depthScore,
            Integer deliveryScore,
            Integer fluencyScore,
            BigDecimal voiceQualityRatio,
            String aiFeedback
    ) {}
}
