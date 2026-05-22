package kr.co.carrer.admin.jobnotice.repository;

import kr.co.carrer.admin.jobnotice.entity.JobNotice;
import kr.co.carrer.admin.jobnotice.type.JobNoticeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobNoticeRepository extends JpaRepository<JobNotice, Long> {
    Page<JobNotice> findAllByStatus(JobNoticeStatus status, Pageable pageable);
    Page<JobNotice> findAllByCompanyId(Long companyId, Pageable pageable);
}
