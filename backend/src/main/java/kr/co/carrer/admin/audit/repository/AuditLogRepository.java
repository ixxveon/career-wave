package kr.co.carrer.admin.audit.repository;

import kr.co.carrer.admin.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
