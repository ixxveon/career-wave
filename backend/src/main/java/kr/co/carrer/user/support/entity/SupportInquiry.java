package kr.co.carrer.user.support.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.support.type.InquiryCategory;
import kr.co.carrer.user.support.type.InquiryStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SupportInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id")
    private Long inquiryId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

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

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @PrePersist
    private void prePersist() {
        this.inquiryStatus = InquiryStatus.PENDING;
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static SupportInquiry create(UUID memberId, InquiryCategory category, String title, String content) {
        SupportInquiry inquiry = new SupportInquiry();
        inquiry.memberId = memberId;
        inquiry.category = category;
        inquiry.title = title;
        inquiry.content = content;
        return inquiry;
    }
}
