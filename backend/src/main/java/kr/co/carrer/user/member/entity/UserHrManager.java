package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.HrStatus;
import kr.co.carrer.user.member.type.PermissionLevel;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity(name = "UserHrManager")
@Table(name = "hr_managers",
        uniqueConstraints = @UniqueConstraint(name = "uq_hr_member_id", columnNames = "member_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserHrManager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hr_manager_id")
    private Long hrManagerId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "company_profile_id", nullable = false, columnDefinition = "uuid")
    private UUID companyProfileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_level", nullable = false, length = 10)
    private PermissionLevel permissionLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "hr_status", nullable = false, length = 20)
    private HrStatus hrStatus;

    @Column(name = "reject_reason")
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @PrePersist
    protected void onCreate() {
        if (hrStatus == null) hrStatus = HrStatus.PENDING_REVIEW;
        if (permissionLevel == null) permissionLevel = PermissionLevel.FULL;
        createdAt = Instant.now();
    }

    public static UserHrManager pendingFor(UUID memberId, UUID companyProfileId) {
        UserHrManager h = new UserHrManager();
        h.memberId = Objects.requireNonNull(memberId, "memberId must not be null");
        h.companyProfileId = Objects.requireNonNull(companyProfileId, "companyProfileId must not be null");
        return h;
    }
}
