package kr.co.carrer.user.jobnotice.repository;

import kr.co.carrer.user.jobnotice.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    boolean existsByMemberIdAndJobNoticeId(UUID memberId, Long jobNoticeId);

    List<Bookmark> findByMemberIdAndJobNoticeIdIn(UUID memberId, List<Long> jobNoticeIds);

    Optional<Bookmark> findByMemberIdAndJobNoticeId(UUID memberId, Long jobNoticeId);
}
