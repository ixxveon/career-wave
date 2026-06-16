package kr.co.carrer.user.support.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.support.type.NoticeCategory;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SupportNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notice_id")
    private Long noticeId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private NoticeCategory category;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_visible", nullable = false)
    private boolean isVisible;

    @Column(name = "is_pinned", nullable = false)
    private boolean isPinned;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

}
