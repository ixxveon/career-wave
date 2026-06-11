package kr.co.carrer.user.jobNotice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import kr.co.carrer.user.jobNotice.type.CareerLevel;
import kr.co.carrer.user.jobNotice.type.CompanySize;
import kr.co.carrer.user.jobNotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobNotice.type.JobType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.ZonedDateTime;

@Entity
@Table(name = "job_notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_notice_id")
    private Long jobNoticeId;

    @Column(name = "company_name", length = 100)
    private String companyName;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "skill_tags", columnDefinition = "text[]")
    private String[] skillTags;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", length = 20)
    private JobType jobType;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_size", length = 20)
    private CompanySize companySize;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "job_category", columnDefinition = "text[]")
    private String[] jobCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "career_level", length = 20)
    private CareerLevel careerLevel;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "salary", length = 50)
    private String salary;

    @Enumerated(EnumType.STRING)
    @Column(name = "notice_status", nullable = false, length = 20)
    private JobNoticeStatus noticeStatus;

    @Column(name = "original_url", nullable = false, columnDefinition = "TEXT")
    private String originalUrl;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.viewCount == null) {
            this.viewCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }
}
