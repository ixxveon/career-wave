package kr.co.carrer.admin.admin.service;

import kr.co.carrer.admin.admin.entity.AuditLog;
import kr.co.carrer.admin.admin.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuditLogWriter {

    private static final String LOG_TYPE_ADMIN_MANAGEMENT = "ADMIN_MANAGEMENT";

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeSuccess(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            String severity
    ) {
        save(actorAdminId, action, targetType, targetId, ipAddress, severity, "result=SUCCESS");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeFailure(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            String severity,
            String detail
    ) {
        save(actorAdminId, action, targetType, targetId, ipAddress, severity, detail);
    }

    private void save(
            Long actorAdminId,
            String action,
            String targetType,
            Long targetId,
            String ipAddress,
            String severity,
            String detail
    ) {
        if (actorAdminId == null) {
            throw new IllegalArgumentException("actorAdminId must not be null");
        }

        AuditLog auditLog = AuditLog.create(
                actorAdminId,
                LOG_TYPE_ADMIN_MANAGEMENT,
                action,
                targetType,
                targetId,
                ipAddress,
                severity,
                detail
        );
        auditLogRepository.save(auditLog);
    }
}
