package kr.co.carrer.user.dashboard.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "personal_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "personal_profile_id")
    private Long personalProfileId;

    @Column(name = "member_id", nullable = false, unique = true, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "target_job", length = 100)
    private String targetJob;

    @Column(name = "github_url", length = 300)
    private String githubUrl;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }
}