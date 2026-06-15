package kr.co.carrer.admin.admin.repository;

import kr.co.carrer.admin.admin.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("adminManagementRepository")
public interface AdminRepository extends JpaRepository<Admin, Long> {

    boolean existsByEmail(String email);
}
