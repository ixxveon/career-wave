package kr.co.carrer.user.resume.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
}
