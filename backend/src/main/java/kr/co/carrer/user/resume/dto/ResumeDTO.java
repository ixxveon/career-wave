package kr.co.carrer.user.resume.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class ResumeDTO {

    // 이력서 업로드 응답
    @Schema(description = "이력서 업로드 응답")
    public record ResponseUpload(
            @Schema(description = "문서 고유 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            UUID documentId,
            @Schema(description = "분석 상태", example = "UPLOADED")
            String status,
            @Schema(description = "S3 파일 URL", example = "https://careerwave-files.s3.ap-northeast-2.amazonaws.com/resumes/2026-06-10/uuid.pdf")
            String fileUrl,
            @Schema(description = "원본 파일명", example = "홍길동_이력서.pdf")
            String originalName,
            @Schema(description = "파일 타입", example = "RESUME")
            String fileType,
            @Schema(description = "업로드 일시", example = "2026-06-10T12:00:00+09:00")
            ZonedDateTime createdAt
    ) {}

    // 자기소개서 제출 요청
    @Schema(description = "자기소개서 제출 요청")
    public record RequestCoverLetter(
            @Schema(description = "지원 회사명", example = "카카오")
            @NotBlank String company,
            @Schema(description = "지원 직무명", example = "백엔드 개발자")
            @NotBlank String job,
            @Schema(description = "문항 목록 (1~5개)")
            @NotNull @Size(min = 1, max = 5, message = "자기소개서 문항은 1개 이상 5개 이하로 입력해주세요.") @Valid List<ContentItem> content
    ) {
        @Schema(description = "자기소개서 문항 단건")
        public record ContentItem(
                @Schema(description = "문항 순서 (1~5)", example = "1")
                @Min(value = 1, message = "문항 순서는 1 이상이어야 합니다.") @Max(value = 5, message = "문항 순서는 5 이하이어야 합니다.") int order,
                @Schema(description = "문항 내용", example = "지원 동기를 작성해주세요.")
                @NotBlank(message = "문항 내용을 입력해주세요.") String question,
                @Schema(description = "답변 내용 (최대 1000자)", example = "저는 대규모 트래픽 처리에 관심이 많아 카카오에 지원하게 되었습니다.")
                @NotBlank(message = "답변 내용을 입력해주세요.") @Size(max = 1000, message = "자기소개서 답변은 1000자를 초과할 수 없습니다.") String answer
        ) {}
    }

    // 자기소개서 제출 응답
    @Schema(description = "자기소개서 제출 응답")
    public record ResponseCoverLetter(
            @Schema(description = "문서 고유 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            UUID documentId,
            @Schema(description = "분석 상태", example = "UPLOADED")
            String status,
            @Schema(description = "파일 타입", example = "COVER_LETTER")
            String fileType,
            @Schema(description = "제출 일시", example = "2026-06-10T12:00:00+09:00")
            ZonedDateTime createdAt
    ) {}

    // 분석 결과 조회 응답
    @Schema(description = "분석 결과 조회 응답")
    public record ResponseFeedback(
            @Schema(description = "문서 고유 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            UUID documentId,
            @Schema(description = "분석 상태", example = "COMPLETED")
            String status,
            @Schema(description = "역량 점수 (분석 미완료 시 null)")
            ScoreDTO scores,
            @Schema(description = "AI 종합 총평 (분석 미완료 시 null)", example = "전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다.")
            String overallReview,
            @Schema(description = "항목별 첨삭 결과 (분석 미완료 시 null)")
            List<FeedbackDetail> feedbackDetails,
            @Schema(description = "분석 실패 메시지 (정상 완료 시 null)", example = "null")
            String errorMessage,
            @Schema(description = "생성 일시", example = "2026-06-10T12:00:00+09:00")
            ZonedDateTime createdAt
    ) {
        @Schema(description = "역량 점수 상세")
        public record ScoreDTO(
                @Schema(description = "직무 적합도 (0~100)", example = "85")
                Integer jobFitness,
                @Schema(description = "기술 스택 (0~100)", example = "90")
                Integer techStack,
                @Schema(description = "경험 수치화 (0~100)", example = "75")
                Integer quantifiedAchievement,
                @Schema(description = "논리력 (0~100)", example = "80")
                Integer logicalStructure,
                @Schema(description = "종합 점수 (0~100)", example = "82")
                Integer total
        ) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        @Schema(description = "항목별 첨삭 결과")
        public record FeedbackDetail(
                @Schema(description = "문항 번호", example = "1")
                int sectionNumber,
                @Schema(description = "문항 내용", example = "주요 프로젝트 경험")
                String question,
                @Schema(description = "원문", example = "결제 시스템 개발에 참여하였습니다.")
                String originalText,
                @Schema(description = "잘된 점", example = "백엔드 프로젝트 경험이 확인됩니다.")
                String goodPoint,
                @Schema(description = "아쉬운 점", example = "역할, 규모, 성과가 빠져 있습니다.")
                String badPoint,
                @Schema(description = "개선된 문장", example = "월 거래액 50억 규모의 결제 시스템 API를 설계 및 구현...")
                String improvedText,
                @Schema(description = "STAR 분석 (이력서 전용, 자기소개서는 null)")
                StarAnalysis starAnalysis,
                @Schema(description = "수치화 분석 (항목별 null 허용)")
                QuantAnalysis quantAnalysis
        ) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        @Schema(description = "STAR 분석")
        public record StarAnalysis(
                @Schema(description = "Situation") StarItem s,
                @Schema(description = "Task") StarItem t,
                @Schema(description = "Action") StarItem a,
                @Schema(description = "Result") StarItem r
        ) {
            @JsonIgnoreProperties(ignoreUnknown = true)
            public record StarItem(
                    @Schema(description = "충족 여부", example = "true") boolean ok,
                    @Schema(description = "코멘트", example = "상황 설명이 적절합니다.") String comment
            ) {}
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        @Schema(description = "수치화 분석")
        public record QuantAnalysis(
                @Schema(description = "수치 사용") QuantItem numbers,
                @Schema(description = "기간 표현") QuantItem timeframe,
                @Schema(description = "규모 언급") QuantItem scale,
                @Schema(description = "성과 수치화") QuantItem impact
        ) {
            @JsonIgnoreProperties(ignoreUnknown = true)
            public record QuantItem(
                    @Schema(description = "충족 여부", example = "false") boolean ok,
                    @Schema(description = "코멘트", example = "수치가 사용되지 않았습니다.") String comment
            ) {}
        }
    }

    // Webhook 수신 요청 (FastAPI → Spring)
    @Schema(description = "FastAPI 분석 완료 웹훅 요청")
    public record RequestWebhook(
            @Schema(description = "문서 고유 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            @NotNull UUID documentId,
            @Schema(description = "분석 결과 상태 (COMPLETED 또는 FAILED)", example = "COMPLETED")
            @NotBlank String status,
            @Schema(description = "직무 적합도 점수 (FAILED 시 null)", example = "85")
            Integer scoreJobFitness,
            @Schema(description = "기술 스택 점수 (FAILED 시 null)", example = "90")
            Integer scoreTechStack,
            @Schema(description = "경험 수치화 점수 (FAILED 시 null)", example = "75")
            Integer scoreQuantified,
            @Schema(description = "논리력 점수 (FAILED 시 null)", example = "80")
            Integer scoreLogical,
            @Schema(description = "종합 점수 (FAILED 시 null)", example = "82")
            Integer scoreTotal,
            @Schema(description = "AI 종합 총평 (FAILED 시 null)", example = "전반적으로 역량이 우수합니다.")
            String overallReview,
            @Schema(description = "항목별 첨삭 JSON 문자열 (FAILED 시 null)")
            String feedbackText,
            @Schema(description = "분석 실패 메시지 (COMPLETED 시 null)", example = "AI 분석 중 오류 발생")
            String errorMessage
    ) {}

    // 이력 목록 조회 응답 (단건)
    @Schema(description = "이력 목록 단건")
    public record HistoryItem(
            @Schema(description = "문서 고유 ID", example = "550e8400-e29b-41d4-a716-446655440000")
            UUID documentId,
            @Schema(description = "파일 타입", example = "RESUME")
            String fileType,
            @Schema(description = "분석 상태", example = "COMPLETED")
            String status,
            @Schema(description = "원본 파일명 (자기소개서는 null)", example = "홍길동_이력서.pdf")
            String originalName,
            @Schema(description = "지원 회사명 (이력서는 null)", example = "카카오")
            String company,
            @Schema(description = "지원 직무명 (이력서는 null)", example = "백엔드 개발자")
            String job,
            @Schema(description = "종합 점수 (분석 미완료 시 null)", example = "82")
            Integer scoreTotal,
            @Schema(description = "생성 일시", example = "2026-06-10T12:00:00+09:00")
            ZonedDateTime createdAt
    ) {
        // JPQL SELECT new 생성자용 — Enum → String 변환
        public HistoryItem(UUID documentId, FileType fileType, DocumentStatus status, String originalName,
                           String company, String job, Integer scoreTotal, ZonedDateTime createdAt) {
            this(documentId, fileType.name(), status.name(), originalName, company, job, scoreTotal, createdAt);
        }
    }

    // 서류 분석 횟수 조회 응답
    @Schema(description = "서류 분석 횟수 조회 응답")
    public record ResponseQuota(
            @Schema(description = "이번 달 사용 횟수", example = "7")
            int usedCount,
            @Schema(description = "월 한도", example = "30")
            int limitCount
    ) {}
}
