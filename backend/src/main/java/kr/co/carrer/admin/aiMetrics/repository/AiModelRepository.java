package kr.co.carrer.admin.aiMetrics.repository;

import kr.co.carrer.admin.aiMetrics.entity.AiModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiModelRepository extends JpaRepository<AiModel, Long> {

    List<AiModel> findByIsEnabledTrue();
}
