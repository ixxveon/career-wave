package kr.co.carrer.user.member.repository;

import jakarta.persistence.EntityManager;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserMemberStatusQueryRepository {

    private final EntityManager entityManager;

    public record SuspendHistoryRow(String reason, Instant startedAt, Instant availableAt, String duration) {}

    public SuspendHistoryRow findLatestSuspendHistory(UUID memberId) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT reason, start_date, end_date, duration " +
                "FROM suspend_histories WHERE member_id = :memberId " +
                "ORDER BY created_at DESC LIMIT 1"
        ).setParameter("memberId", memberId).getResultList();

        if (rows.isEmpty()) return null;

        Object[] row = (Object[]) rows.get(0);
        return new SuspendHistoryRow(
                (String) row[0],
                row[1] != null ? toInstant(row[1]) : null,
                row[2] != null ? toInstant(row[2]) : null,
                row[3] != null ? row[3].toString() : null
        );
    }

    public CompanyApprovalStatus findCompanyApprovalStatus(UUID memberId) {
        return mapCompanyApprovalStatus(findCompanyHrStatus(memberId));
    }

    public CompanyApprovalStatus mapCompanyApprovalStatus(String hrStatus) {
        if (hrStatus == null) return CompanyApprovalStatus.NONE;
        return switch (hrStatus) {
            case "PENDING_REVIEW" -> CompanyApprovalStatus.PENDING_REVIEW;
            case "APPROVED"       -> CompanyApprovalStatus.APPROVED;
            case "REJECTED"       -> CompanyApprovalStatus.REJECTED;
            case "NEEDS_REVISION" -> CompanyApprovalStatus.NEEDS_REVISION;
            case "REMOVED"        -> CompanyApprovalStatus.NONE;
            default               -> CompanyApprovalStatus.NONE;
        };
    }

    public String findCompanyHrStatus(UUID memberId) {
        Object result = entityManager.createNativeQuery(
                "SELECT hr_status FROM hr_managers WHERE member_id = :memberId LIMIT 1"
        ).setParameter("memberId", memberId).getResultList()
                .stream().findFirst().orElse(null);

        return result != null ? result.toString() : null;
    }

    private Instant toInstant(Object dateObj) {
        if (dateObj instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        if (dateObj instanceof LocalDate localDate) {
            return localDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        return null;
    }
}
