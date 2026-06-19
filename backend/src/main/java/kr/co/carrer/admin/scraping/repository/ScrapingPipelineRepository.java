package kr.co.carrer.admin.scraping.repository;

import kr.co.carrer.admin.scraping.entity.ScrapingPipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
// Pipeline aggregation and state transitions are handled by FastAPI, not this repository.
public interface ScrapingPipelineRepository extends JpaRepository<ScrapingPipeline, Long> {

    Optional<ScrapingPipeline> findBySourceName(String sourceName);
}
