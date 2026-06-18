package kr.co.carrer.admin.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.PermissionLevel;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "hr_managers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HrManager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hr_manager_id")
    private Long hrManagerId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "company_profile_id", nullable = false, columnDefinition = "UUID")
    private UUID companyProfileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission_level", nullable = false, length = 10)
    private PermissionLevel permissionLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "hr_status", nullable = false, length = 20)
    private HrStatus hrStatus;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    public void approve() {
        this.hrStatus = HrStatus.APPROVED;
        this.approvedAt = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
    }

    public void reject(String rejectReason) {
        this.hrStatus = HrStatus.REJECTED;
        this.rejectReason = rejectReason;
    }
}
