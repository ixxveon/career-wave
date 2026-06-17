package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.HrStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "UserHrManager")
@Table(name = "hr_managers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HrManager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hr_manager_id")
    private Long hrManagerId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Column(name = "company_profile_id", nullable = false, columnDefinition = "uuid")
    private UUID companyProfileId;

    // FULL / NOTICE / VIEWER — 상태 변경은 admin 도메인 책임
    @Column(name = "permission_level", nullable = false, length = 10)
    private String permissionLevel;

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
        if (permissionLevel == null) permissionLevel = "FULL";
        createdAt = Instant.now();
    }

    public static HrManager pendingFor(UUID memberId, UUID companyProfileId) {
        HrManager h = new HrManager();
        h.memberId = memberId;
        h.companyProfileId = companyProfileId;
        return h;
    }
}
