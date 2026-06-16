package kr.co.carrer.user.support.dto;

import kr.co.carrer.user.support.type.FaqCategory;
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
}
