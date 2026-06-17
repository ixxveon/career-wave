package kr.co.carrer.user.jobnotice.repository;

import kr.co.carrer.user.jobnotice.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    boolean existsByMemberIdAndJobNotice_JobNoticeId(UUID memberId, Long jobNoticeId);

    List<Bookmark> findByMemberIdAndJobNotice_JobNoticeIdIn(UUID memberId, List<Long> jobNoticeIds);

    Optional<Bookmark> findByMemberIdAndJobNotice_JobNoticeId(UUID memberId, Long jobNoticeId);

    Optional<Bookmark> findByBookmarkIdAndMemberId(Long bookmarkId, UUID memberId);
}
