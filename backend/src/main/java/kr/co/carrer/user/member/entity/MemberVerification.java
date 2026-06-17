package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "member_verifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberVerification {

    @Id
    @Column(name = "verification_id", columnDefinition = "uuid")
    private UUID verificationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10)
    private VerificationChannel channel;

    @Column(name = "target", nullable = false, length = 100)
    private String target;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private VerificationPurpose purpose;

    // 인증번호 원문은 저장하지 않고 해시값만 저장
    @Column(name = "code_hash", nullable = false, length = 255)
    private String codeHash;

    // 인증 완료 후 발급되는 단기 토큰 (서비스에서 verificationToken 유효성 검증)
    @Column(name = "verification_token", length = 255)
    private String verificationToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    // 기본값 5 — DB DEFAULT와 동기화
    @Column(name = "remaining_attempts", nullable = false)
    private int remainingAttempts;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    // TTL=5분, 재발송 제한=60초 기준으로 서비스에서 설정
    @Column(name = "resend_available_at", nullable = false)
    private Instant resendAvailableAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (verificationId == null) verificationId = UUID.randomUUID();
        if (verificationStatus == null) verificationStatus = VerificationStatus.SENT;
        if (remainingAttempts == 0) remainingAttempts = 5;
        createdAt = Instant.now();
    }

    public void markVerified(String token) {
        this.verificationToken = token;
        this.verificationStatus = VerificationStatus.VERIFIED;
        this.verifiedAt = Instant.now();
    }

    public void decrementAttempts() {
        this.remainingAttempts = Math.max(0, this.remainingAttempts - 1);
        if (this.remainingAttempts == 0) {
            this.verificationStatus = VerificationStatus.FAILED;
        }
    }

    public void expire() {
        this.verificationStatus = VerificationStatus.EXPIRED;
    }
}
