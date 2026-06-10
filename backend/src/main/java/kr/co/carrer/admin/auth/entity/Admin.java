package kr.co.carrer.admin.auth.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.auth.dto.AdminRole;
import kr.co.carrer.admin.auth.dto.AdminStatus;

import java.time.Instant;

@Entity
@Table(name = "admins")
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "admin_id")
    private Long adminId;

    // DB 컬럼명은 email이지만 loginId로 사용 (담당자가 DDL 수정 예정)
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String loginId;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_role", nullable = false, length = 20)
    private AdminRole adminRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdminStatus status;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = AdminStatus.ACTIVE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getAdminId() { return adminId; }
    public String getLoginId() { return loginId; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public AdminRole getAdminRole() { return adminRole; }
    public AdminStatus getStatus() { return status; }
    public Instant getLastLoginAt() { return lastLoginAt; }

    public void updateLastLoginAt(Instant time) { this.lastLoginAt = time; }
}
