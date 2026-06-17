package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity(name = "UserPersonalProfile")
@Table(name = "personal_profiles",
        uniqueConstraints = @UniqueConstraint(name = "uq_personal_member_id", columnNames = "member_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PersonalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "personal_profile_id")
    private Long personalProfileId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "target_job", length = 100)
    private String targetJob;

    @Column(name = "github_url", length = 300)
    private String githubUrl;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public static PersonalProfile emptyFor(UUID memberId) {
        Objects.requireNonNull(memberId, "memberId must not be null");
        PersonalProfile profile = new PersonalProfile();
        profile.memberId = memberId;
        return profile;
    }
}
