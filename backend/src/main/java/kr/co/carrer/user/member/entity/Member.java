package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "UserMember")
@Table(name = "members")
public class Member {

    @Id
    @Column(name = "member_id", columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "login_id", nullable = false, unique = true, length = 100)
    private String loginId;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "phone", length = 20)
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

    // Getters
    public UUID getMemberId() { return memberId; }
    public String getLoginId() { return loginId; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPassword() { return password; }
    public String getName() { return name; }
    public RoleType getRoleType() { return roleType; }
    public MemberStatus getMemberStatus() { return memberStatus; }
    public SubscriptionStatus getSubscriptionStatus() { return subscriptionStatus; }
    public Instant getLockedUntil() { return lockedUntil; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void updateLastLoginAt(Instant time) { this.lastLoginAt = time; }

    // locked_until 경과 시 ACTIVE 자동 복구 — dirty checking으로 DB 저장
    public void recoverFromLock() {
        this.memberStatus = MemberStatus.ACTIVE;
        this.lockedUntil = null;
    }
}
