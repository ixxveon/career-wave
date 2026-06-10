package kr.co.carrer.admin.member.repository;

import kr.co.carrer.admin.member.entity.SuspendHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuspendHistoryRepository extends JpaRepository<SuspendHistory, Long> {
}
