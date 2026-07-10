package kr.co.carrer.user.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.co.carrer.user.support.type.FaqCategory;
import kr.co.carrer.user.support.type.InquiryCategory;
import kr.co.carrer.user.support.type.InquiryStatus;
import kr.co.carrer.user.support.type.NoticeCategory;

import java.time.ZonedDateTime;

public class SupportDTO {

    public record NoticeList(
        Long noticeId,
        NoticeCategory category,
        String title,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt
    ) {}

    public record NoticeDetail(
        Long noticeId,
        NoticeCategory category,
        String title,
        String content,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt,
        PrevNext prevNotice,
        PrevNext nextNotice
    ) {
        public record PrevNext(Long noticeId, String title) {}
    }

    public record FaqItem(
        Long faqId,
        FaqCategory category,
        String question,
        String answer,
        ZonedDateTime createdAt
    ) {}

    public record InquiryList(
        Long inquiryId,
        InquiryCategory category,
        String title,
        String contentPreview,
        String reply,
        InquiryStatus inquiryStatus,
        ZonedDateTime createdAt
    ) {}

    public record RequestCreateInquiry(
        @NotNull InquiryCategory category,
        @NotBlank @Size(max = 100, message = "제목은 100자를 초과할 수 없습니다.") String title,
        @NotBlank @Size(min = 10, max = 2000, message = "문의 내용은 10자 이상 2000자 이하로 입력해주세요.") String content
    ) {}

    public record ResponseCreateInquiry(
        Long inquiryId,
        InquiryStatus inquiryStatus
    ) {}
}
