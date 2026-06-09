package kr.co.carrer.admin.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "member_id", columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "login_id", nullable = false, unique = true, length = 100)
    private String loginId;

    @Column(name = "email", unique = true, length = 100)
    private String email;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "phone", length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_type", nullable = false, length = 20)
    private RoleType roleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_status", nullable = false, length = 20)
    private MemberStatus memberStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", nullable = false, length = 10)
    private SubscriptionStatus subscriptionStatus;

    @Column(name = "suspend_end_date")
    private LocalDate suspendEndDate;

    @Column(name = "warning_count", nullable = false)
    private int warningCount;

    @Column(name = "last_login_at")
    private ZonedDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    public void increaseWarningCount() {
        this.warningCount++;
        this.updatedAt = ZonedDateTime.now();
    }

    public void suspend(LocalDate suspendEndDate) {
        this.memberStatus = MemberStatus.SUSPENDED;
        this.suspendEndDate = suspendEndDate;
        this.updatedAt = ZonedDateTime.now();
    }

    public void ban() {
        this.memberStatus = MemberStatus.BANNED;
        this.suspendEndDate = null;
        this.updatedAt = ZonedDateTime.now();
    }
}
