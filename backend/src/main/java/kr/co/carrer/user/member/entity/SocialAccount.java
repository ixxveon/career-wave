package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.SocialProvider;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "social_accounts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_social_provider_user",   columnNames = {"provider", "provider_user_id"}),
                @UniqueConstraint(name = "uq_social_member_provider", columnNames = {"member_id", "provider"})
        },
        indexes = @Index(name = "idx_social_accounts_member_id", columnList = "member_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialAccount {

    @Id
    @Column(name = "social_account_id", columnDefinition = "uuid")
    private UUID socialAccountId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    // provider IN ('KAKAO', 'NAVER', 'GOOGLE') — Apple 미지원
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private SocialProvider provider;

    // 회원 식별 주키: provider + providerUserId (email 사용 금지)
    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    // provider 정책상 email을 반환하지 않을 수 있으므로 nullable
    @Column(name = "provider_email", length = 255)
    private String providerEmail;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (socialAccountId == null) socialAccountId = UUID.randomUUID();
        Instant now = Instant.now();
        linkedAt = now;
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
