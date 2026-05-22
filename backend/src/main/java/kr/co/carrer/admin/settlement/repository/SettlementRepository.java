package kr.co.carrer.admin.settlement.repository;

import kr.co.carrer.admin.settlement.entity.Settlement;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Page<Settlement> findAllByStatus(SettlementStatus status, Pageable pageable);
    List<Settlement> findAllByMentorIdAndSettlementMonth(Long mentorId, String settlementMonth);
}
