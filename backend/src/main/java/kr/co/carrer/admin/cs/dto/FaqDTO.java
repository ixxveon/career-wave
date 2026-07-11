package kr.co.carrer.admin.cs.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.co.carrer.admin.cs.type.FaqCategory;

import java.time.ZonedDateTime;

public class FaqDTO {

    public record RequestCreate(
        @NotNull FaqCategory category,
        @NotBlank @Size(max = 500) String question,
        @NotBlank String answer
    ) {}

    public record RequestUpdate(
        @NotNull FaqCategory category,
        @NotBlank @Size(max = 500) String question,
        @NotBlank String answer
    ) {}

    @Schema(description = "FAQ 목록 응답")
    public record ResponseList(
        Long faqId,
        FaqCategory category,
        String question,
        String answer,
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "FAQ 등록·수정 결과")
    public record ResponseResult(
        Long faqId,
        ZonedDateTime updatedAt
    ) {}
}
