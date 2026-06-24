package kr.co.carrer.user.billing.repository;

import kr.co.carrer.user.billing.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, Long> {

    Optional<Plan> findByProductCode(String productCode);

    Optional<Plan> findByProductCodeAndIsActive(String productCode, boolean isActive);

    List<Plan> findAllByIsActiveTrueOrderByPlanIdAsc();
}
