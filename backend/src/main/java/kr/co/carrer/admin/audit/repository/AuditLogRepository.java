package kr.co.carrer.admin.audit.repository;

import kr.co.carrer.admin.audit.entity.AuditLog;
import org.springframework.data.repository.Repository;

public interface AuditLogRepository extends Repository<AuditLog, Long> {
    java.util.Optional<AuditLog> findById(Long auditLogId);
}
