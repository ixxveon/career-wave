package kr.co.carrer.admin.company.repository;

import kr.co.carrer.admin.company.entity.Company;
import kr.co.carrer.admin.company.type.CompanyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Page<Company> findAllByStatus(CompanyStatus status, Pageable pageable);
    boolean existsByBusinessNumber(String businessNumber);
}
