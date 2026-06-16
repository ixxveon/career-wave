package kr.co.carrer.user.interview.repository;

import kr.co.carrer.user.interview.entity.CareerHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CareerHistoryRepository extends JpaRepository<CareerHistory, Long> {

    Page<CareerHistory> findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable);

    Optional<CareerHistory> findByMemberIdAndSessionId(UUID memberId, UUID sessionId);
}
