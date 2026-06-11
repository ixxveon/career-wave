package kr.co.carrer.user.jobNotice.repository;

import kr.co.carrer.user.jobNotice.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    boolean existsByMemberIdAndJobNoticeId(UUID memberId, Long jobNoticeId);

    Optional<Bookmark> findByMemberIdAndJobNoticeId(UUID memberId, Long jobNoticeId);
}
