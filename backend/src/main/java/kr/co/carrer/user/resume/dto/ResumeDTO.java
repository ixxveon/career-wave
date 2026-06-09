package kr.co.carrer.user.resume.dto;

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
    public record ResponseUpload(
            UUID documentId,
            String status,
            String fileUrl,
            String originalName,
            String fileType,
            ZonedDateTime createdAt
    ) {}

    // 자기소개서 제출 요청
    public record RequestCoverLetter(
            @NotBlank String company,
            @NotBlank String job,
            @NotNull @Size(min = 1, max = 5) @Valid List<ContentItem> content
    ) {
        public record ContentItem(
                @Min(1) @Max(5) int order,
                @NotBlank String question,
                @NotBlank @Size(max = 1000) String answer
        ) {}
    }

    // 자기소개서 제출 응답
    public record ResponseCoverLetter(
            UUID documentId,
            String status,
            String fileType,
            ZonedDateTime createdAt
    ) {}
}
