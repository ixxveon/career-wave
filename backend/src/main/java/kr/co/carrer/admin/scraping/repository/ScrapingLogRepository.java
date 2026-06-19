package kr.co.carrer.admin.scraping.repository;

import kr.co.carrer.admin.scraping.entity.ScrapingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
// Execution log aggregation and creation are handled outside the Spring repository layer.
public interface ScrapingLogRepository extends JpaRepository<ScrapingLog, Long> {
}
