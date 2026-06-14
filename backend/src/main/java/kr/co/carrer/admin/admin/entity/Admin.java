package kr.co.carrer.admin.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Entity
@Table(name = "admins")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_role", nullable = false, length = 20)
    private AdminRole adminRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AdminStatus status;

    @Column(name = "last_login_at")
    private ZonedDateTime lastLoginAt;

    @Column(name = "last_login_ip", length = 45)
    private String lastLoginIp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    public static Admin create(String email, String passwordHash, String name, AdminRole adminRole) {
        Admin admin = new Admin();
        admin.email = email;
        admin.passwordHash = passwordHash;
        admin.name = name;
        admin.adminRole = adminRole;
        admin.status = AdminStatus.ACTIVE;
        return admin;
    }

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = AdminStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }

    public void updateRole(AdminRole adminRole) {
        this.adminRole = adminRole;
    }

    public void updateStatus(AdminStatus status) {
        this.status = status;
    }

    public void updateLastLogin(ZonedDateTime lastLoginAt, String lastLoginIp) {
        this.lastLoginAt = lastLoginAt;
        this.lastLoginIp = lastLoginIp;
    }
}
