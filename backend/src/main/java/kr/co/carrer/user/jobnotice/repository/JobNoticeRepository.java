package kr.co.carrer.user.jobnotice.repository;

import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JobNoticeRepository extends JpaRepository<JobNotice, Long> {

    Optional<JobNotice> findByJobNoticeIdAndNoticeStatus(Long jobNoticeId, JobNoticeStatus noticeStatus);
}
