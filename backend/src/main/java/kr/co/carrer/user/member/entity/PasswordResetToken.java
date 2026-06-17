package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uq_password_reset_token_hash", columnNames = "token_hash"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PasswordResetToken {

    @Id
    @Column(name = "reset_token_id", columnDefinition = "uuid")
    private UUID resetTokenId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    // 토큰 원문은 저장하지 않고 해시값만 저장, 1회 사용 후 used_at 기록
    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (resetTokenId == null) resetTokenId = UUID.randomUUID();
        createdAt = Instant.now();
    }

    public boolean isExpired() {
        return !Instant.now().isBefore(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    public static PasswordResetToken create(UUID memberId, String tokenHash, Instant expiresAt) {
        PasswordResetToken t = new PasswordResetToken();
        t.memberId = memberId;
        t.tokenHash = tokenHash;
        t.expiresAt = expiresAt;
        return t;
    }
}
