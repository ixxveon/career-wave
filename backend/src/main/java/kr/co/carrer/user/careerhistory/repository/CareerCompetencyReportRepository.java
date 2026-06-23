package kr.co.carrer.user.careerhistory.repository;

import kr.co.carrer.user.careerhistory.entity.CareerCompetencyReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CareerCompetencyReportRepository
        extends JpaRepository<CareerCompetencyReport, Long> {

    Optional<CareerCompetencyReport> findByUserId(Long userId);
}
