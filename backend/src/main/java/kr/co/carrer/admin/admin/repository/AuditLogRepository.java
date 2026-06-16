package kr.co.carrer.admin.admin.repository;

import kr.co.carrer.admin.admin.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
