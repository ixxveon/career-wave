package kr.co.carrer.admin.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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

    @Column(name = "admin_id")
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "log_type", nullable = false, length = 50)
    private AuditLogType logType;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id", length = 255)
    private String targetId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private AuditLogSeverity severity;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "search_text", nullable = false, columnDefinition = "TEXT")
    private String searchText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static AuditLog create(
            Long adminId,
            AuditLogType logType,
            String action,
            String targetType,
            String targetId,
            String ipAddress,
            AuditLogSeverity severity,
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
        auditLog.searchText = buildSearchText(action, targetType, targetId, detail);
        return auditLog;
    }

    private static String buildSearchText(String action, String targetType, String targetId, String detail) {
        return Stream.of(action, targetType, targetId, detail)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(" "));
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }
}
