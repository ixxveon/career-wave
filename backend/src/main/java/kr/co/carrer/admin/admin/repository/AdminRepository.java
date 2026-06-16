package kr.co.carrer.admin.admin.repository;

import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("adminManagementRepository")
public interface AdminRepository extends JpaRepository<Admin, Long> {

    boolean existsByEmail(String email);

    long countByStatus(AdminStatus status);

    long countByAdminRole(AdminRole adminRole);
}
