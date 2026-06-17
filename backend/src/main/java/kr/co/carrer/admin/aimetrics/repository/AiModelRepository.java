package kr.co.carrer.admin.aimetrics.repository;

import kr.co.carrer.admin.aimetrics.entity.AiModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiModelRepository extends JpaRepository<AiModel, Long> {

    @Query("SELECT m FROM AiModel m WHERE m.isEnabled = true")
    List<AiModel> findAllEnabled();
}
