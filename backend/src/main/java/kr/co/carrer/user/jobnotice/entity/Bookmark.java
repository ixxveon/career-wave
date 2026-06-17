package kr.co.carrer.user.jobnotice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "bookmarks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_bookmark",
                        columnNames = {"member_id", "job_notice_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bookmark {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bookmark_id")
    private Long bookmarkId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "job_notice_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_bookmark_job")
    )
    private JobNotice jobNotice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static Bookmark of(UUID memberId, JobNotice jobNotice) {
        Bookmark bookmark = new Bookmark();
        bookmark.memberId = memberId;
        bookmark.jobNotice = jobNotice;
        return bookmark;
    }

    public Long getJobNoticeId() {
        return jobNotice.getJobNoticeId();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }
}
