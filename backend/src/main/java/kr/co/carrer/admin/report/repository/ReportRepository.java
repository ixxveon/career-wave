package kr.co.carrer.admin.report.repository;

import kr.co.carrer.admin.report.entity.Report;
import kr.co.carrer.admin.report.type.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReportRepository extends JpaRepository<Report, Long> {

    long countByReportStatus(ReportStatus reportStatus);

    @Query(value = "SELECT COUNT(*) FROM reports WHERE ai_suggestion LIKE '{%' AND ai_suggestion::jsonb ->> 'severity' = 'HIGH'", nativeQuery = true)
    long countHighRisk();
}
