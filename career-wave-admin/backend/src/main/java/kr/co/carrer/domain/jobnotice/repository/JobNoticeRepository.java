package kr.co.carrer.domain.jobnotice.repository;

import kr.co.carrer.domain.jobnotice.entity.JobNotice;
import kr.co.carrer.domain.jobnotice.type.JobNoticeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobNoticeRepository extends JpaRepository<JobNotice, Long> {
    Page<JobNotice> findAllByStatus(JobNoticeStatus status, Pageable pageable);
    Page<JobNotice> findAllByCompanyId(Long companyId, Pageable pageable);
}

