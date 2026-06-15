package kr.co.carrer.admin.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_log_id")
    private Long auditLogId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "log_type", nullable = false, length = 50)
    private String logType;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    @Column(name = "target_id", length = 100)
    private String targetId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "severity", nullable = false, length = 20)
    private String severity;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static AuditLog create(
            Long adminId,
            String logType,
            String action,
            String targetType,
            String targetId,
            String ipAddress,
            String severity,
            String detail
    ) {
        AuditLog auditLog = new AuditLog();
        auditLog.adminId = adminId;
        auditLog.logType = logType;
        auditLog.action = action;
        auditLog.targetType = targetType;
        auditLog.targetId = targetId;
        auditLog.ipAddress = ipAddress;
        auditLog.severity = severity;
        auditLog.detail = detail;
        return auditLog;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }
}
