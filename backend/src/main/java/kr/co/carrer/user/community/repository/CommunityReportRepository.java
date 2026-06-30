package kr.co.carrer.user.community.repository;

import kr.co.carrer.user.community.entity.CommunityReport;
import kr.co.carrer.user.community.type.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    Optional<CommunityReport> findByReporterIdAndTargetTypeAndTargetId(
            UUID reporterId,
            ReportTargetType targetType,
            Long targetId
    );
}