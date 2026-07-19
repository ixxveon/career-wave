package kr.co.carrer.user.community.repository;

import kr.co.carrer.user.community.entity.CommunityReport;
import kr.co.carrer.user.community.type.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    Optional<CommunityReport> findByReporterIdAndTargetTypeAndTargetId(
            UUID reporterId,
            ReportTargetType targetType,
            Long targetId
    );

    long countByTargetTypeAndTargetId(ReportTargetType targetType, Long targetId);

    @Query("SELECT r.targetId, COUNT(r) FROM CommunityReport r "
            + "WHERE r.targetType = :targetType AND r.targetId IN :targetIds "
            + "GROUP BY r.targetId")
    List<Object[]> countGroupedByTargetId(
            @Param("targetType") ReportTargetType targetType,
            @Param("targetIds") Collection<Long> targetIds);
}