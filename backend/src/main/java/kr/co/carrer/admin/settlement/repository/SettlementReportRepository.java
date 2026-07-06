package kr.co.carrer.admin.settlement.repository;

import kr.co.carrer.admin.settlement.entity.SettlementReport;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SettlementReportRepository extends JpaRepository<SettlementReport, Long> {

    Optional<SettlementReport> findBySettlementPeriodStartAndSettlementPeriodEnd(
        LocalDate periodStart, LocalDate periodEnd);

    boolean existsBySettlementPeriodStartAndSettlementPeriodEndAndSettlementStatus(
        LocalDate periodStart, LocalDate periodEnd, SettlementStatus status);
}
