package kr.co.carrer.admin.cs.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.NoticeCategory;

public class AiDTO {

    public record RequestNoticeDraft(
        @NotNull NoticeCategory category,
        @NotBlank String title
    ) {}

    public record RequestFaqDraft(
        @NotBlank String question
    ) {}

    public record RequestInquiryDraft(
        @NotNull InquiryCategory category,
        @NotBlank String title,
        @NotBlank String content
    ) {}

    @Schema(description = "AI 초안 응답")
    public record ResponseDraft(
        String draft
    ) {}
}
