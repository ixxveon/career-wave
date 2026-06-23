package kr.co.carrer.user.careerhistory.repository;

import kr.co.carrer.user.careerhistory.entity.CareerRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareerRoadmapRepository extends JpaRepository<CareerRoadmap, Long> {

    List<CareerRoadmap> findByUserIdOrderByStepAsc(Long userId);
}
