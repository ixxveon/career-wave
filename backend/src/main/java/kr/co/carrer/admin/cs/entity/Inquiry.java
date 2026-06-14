package kr.co.carrer.admin.cs.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id")
    private Long inquiryId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "admin_id")
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private InquiryCategory category;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "reply", columnDefinition = "TEXT")
    private String reply;

    @Enumerated(EnumType.STRING)
    @Column(name = "inquiry_status", nullable = false, length = 20)
    private InquiryStatus inquiryStatus;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @Column(name = "ai_draft", columnDefinition = "TEXT")
    private String aiDraft;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @Column(name = "replied_at")
    private ZonedDateTime repliedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @PrePersist
    private void prePersist() {
        this.inquiryStatus = InquiryStatus.PENDING;
        this.createdAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }

    public void saveReply(String reply, Long adminId) {
        this.reply = reply;
        this.adminId = adminId;
        this.inquiryStatus = InquiryStatus.IN_PROGRESS;
        if (this.repliedAt == null) {
            this.repliedAt = ZonedDateTime.now();
        }
        this.updatedAt = ZonedDateTime.now();
    }

    public void complete() {
        this.inquiryStatus = InquiryStatus.COMPLETED;
        this.completedAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }
}
