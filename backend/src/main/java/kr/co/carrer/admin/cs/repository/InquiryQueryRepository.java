package kr.co.carrer.admin.cs.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class InquiryQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(java.time.ZoneId.systemDefault());
        if (value instanceof java.time.Instant i) return i.atZone(java.time.ZoneId.systemDefault());
        if (value instanceof java.time.OffsetDateTime odt) return odt.toZonedDateTime();
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<InquiryDTO.ResponseList> findInquiries(InquiryCategory category, InquiryStatus status,
                                                        int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT i.inquiry_id, m.name AS member_name, i.category, i.title, i.inquiry_status, i.created_at
            FROM inquiries i
            JOIN members m ON m.member_id = i.member_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND i.category = ?").append(idx++);
            params.add(category.name());
        }
        if (status != null) {
            sql.append(" AND i.inquiry_status = ?").append(idx++);
            params.add(status.name());
        }

        sql.append(" ORDER BY i.created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<InquiryDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new InquiryDTO.ResponseList(
                ((Number) row[0]).longValue(),
                (String) row[1],
                InquiryCategory.valueOf((String) row[2]),
                (String) row[3],
                InquiryStatus.valueOf((String) row[4]),
                toZdt(row[5])
            ));
        }
        return result;
    }

    public long countInquiries(InquiryCategory category, InquiryStatus status) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*) FROM inquiries i
            JOIN members m ON m.member_id = i.member_id
            WHERE 1=1
            """);
        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND i.category = ?").append(idx++);
            params.add(category.name());
        }
        if (status != null) {
            sql.append(" AND i.inquiry_status = ?").append(idx++);
            params.add(status.name());
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<InquiryDTO.ResponseDetail> findDetail(Long inquiryId) {
        Query query = em.createNativeQuery("""
            SELECT i.inquiry_id, m.name, i.category, i.title, i.content, i.reply,
                   i.inquiry_status, i.created_at, i.replied_at, i.completed_at
            FROM inquiries i
            JOIN members m ON m.member_id = i.member_id
            WHERE i.inquiry_id = ?1
            """);
        query.setParameter(1, inquiryId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new InquiryDTO.ResponseDetail(
            ((Number) row[0]).longValue(),
            (String) row[1],
            InquiryCategory.valueOf((String) row[2]),
            (String) row[3],
            (String) row[4],
            (String) row[5],
            InquiryStatus.valueOf((String) row[6]),
            toZdt(row[7]),
            toZdt(row[8]),
            toZdt(row[9])
        ));
    }
}
