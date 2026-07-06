package kr.co.carrer.user.jobnotice.repository;

import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface JobNoticeRepository extends JpaRepository<JobNotice, Long> {

    Optional<JobNotice> findByJobNoticeIdAndNoticeStatus(Long jobNoticeId, JobNoticeStatus noticeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE JobNotice j
               SET j.viewCount = COALESCE(j.viewCount, 0) + 1
             WHERE j.jobNoticeId = :jobNoticeId
               AND j.noticeStatus = kr.co.carrer.user.jobnotice.type.JobNoticeStatus.ACTIVE
            """)
    int incrementViewCountById(@Param("jobNoticeId") Long jobNoticeId);
}
