package kr.co.carrer.admin.cs.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;

import java.time.ZonedDateTime;

public class InquiryDTO {

    public record RequestReply(
        @NotBlank String reply
    ) {}

    @Schema(description = "문의 목록 응답")
    public record ResponseList(
        Long inquiryId,
        String memberName,
        InquiryCategory category,
        String title,
        InquiryStatus inquiryStatus,
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "문의 상세 응답")
    public record ResponseDetail(
        Long inquiryId,
        String memberName,
        InquiryCategory category,
        String title,
        String content,
        String reply,
        InquiryStatus inquiryStatus,
        ZonedDateTime createdAt,
        ZonedDateTime repliedAt,
        ZonedDateTime completedAt
    ) {}

    @Schema(description = "답변 저장 결과")
    public record ResponseReply(
        Long inquiryId,
        InquiryStatus inquiryStatus,
        ZonedDateTime repliedAt
    ) {}

    @Schema(description = "처리 완료 결과")
    public record ResponseComplete(
        Long inquiryId,
        InquiryStatus inquiryStatus,
        ZonedDateTime completedAt
    ) {}
}
