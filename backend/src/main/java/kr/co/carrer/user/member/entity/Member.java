package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity(name = "UserMember")
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @Column(name = "member_id", columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "login_id", nullable = false, unique = true, length = 100)
    private String loginId;

    @Column(unique = true, length = 100)
    private String email;

    @Column(name = "phone", unique = true, length = 20)
    private String phone;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_type", nullable = false, length = 20)
    private RoleType roleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_status", nullable = false, length = 20)
    private MemberStatus memberStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", nullable = false, length = 20)
    private SubscriptionStatus subscriptionStatus;

    @Column(name = "suspend_end_date")
    private LocalDate suspendEndDate;

    @Column(name = "warning_count", nullable = false)
    private int warningCount;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (memberId == null) memberId = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public void updateLastLoginAt(Instant time) { this.lastLoginAt = time; }

    // locked_until 경과 시 ACTIVE 자동 복구 — dirty checking으로 DB 저장
    public void recoverFromLock() {
        this.memberStatus = MemberStatus.ACTIVE;
        this.lockedUntil = null;
    }

    // 로그인 실패 5회 도달 시 잠금 처리 — dirty checking으로 DB 저장
    public void lockAccount(Instant lockedUntil) {
        this.memberStatus = MemberStatus.LOCKED;
        this.lockedUntil = lockedUntil;
    }
    public void updateProfile(String name, String phone) {
        this.name = name;
        this.phone = phone;
    }
}
