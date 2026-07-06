package kr.co.carrer.admin.settlement.repository;

import kr.co.carrer.admin.settlement.entity.SettlementItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementItemRepository extends JpaRepository<SettlementItem, Long> {

    List<SettlementItem> findBySettlementId(Long settlementId);

    void deleteBySettlementId(Long settlementId);
}
