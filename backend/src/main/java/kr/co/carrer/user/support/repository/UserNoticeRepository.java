package kr.co.carrer.user.support.repository;

import kr.co.carrer.user.support.entity.SupportNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNoticeRepository extends JpaRepository<SupportNotice, Long> {

    @Modifying
    @Query("UPDATE SupportNotice n SET n.viewCount = n.viewCount + 1 WHERE n.noticeId = :noticeId")
    void incrementViewCountById(@Param("noticeId") Long noticeId);
}
