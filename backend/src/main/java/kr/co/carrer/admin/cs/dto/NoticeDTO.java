package kr.co.carrer.admin.cs.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.co.carrer.admin.cs.type.NoticeCategory;

import java.time.ZonedDateTime;

public class NoticeDTO {

    public record RequestCreate(
        @NotNull NoticeCategory category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        @NotNull Boolean isVisible
    ) {}

    public record RequestUpdate(
        @NotNull NoticeCategory category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        @NotNull Boolean isVisible
    ) {}

    @Schema(description = "공지사항 목록 응답")
    public record ResponseList(
        Long noticeId,
        NoticeCategory category,
        String title,
        boolean isVisible,
        ZonedDateTime createdAt
    ) {}

    @Schema(description = "공지사항 상세 응답")
    public record ResponseDetail(
        Long noticeId,
        NoticeCategory category,
        String title,
        String content,
        boolean isVisible,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {}

    @Schema(description = "공지사항 등록·수정 결과")
    public record ResponseResult(
        Long noticeId,
        ZonedDateTime updatedAt
    ) {}
}
