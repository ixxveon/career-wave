package kr.co.carrer.admin.cs.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class NoticeQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(java.time.ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.Instant i) return i.atZone(java.time.ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.OffsetDateTime odt) return odt.toZonedDateTime();
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<NoticeDTO.ResponseList> findNotices(NoticeCategory category, Boolean visible,
                                                     String keyword, int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT notice_id, category, title, is_visible, created_at
            FROM notices
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        if (visible != null) {
            sql.append(" AND is_visible = ?").append(idx++);
            params.add(visible);
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND title ILIKE ?").append(idx++);
            params.add("%" + keyword + "%");
        }

        sql.append(" ORDER BY created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<NoticeDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new NoticeDTO.ResponseList(
                ((Number) row[0]).longValue(),
                NoticeCategory.valueOf((String) row[1]),
                (String) row[2],
                (Boolean) row[3],
                toZdt(row[4])
            ));
        }
        return result;
    }

    public long countNotices(NoticeCategory category, Boolean visible, String keyword) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM notices WHERE 1=1");
        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        if (visible != null) {
            sql.append(" AND is_visible = ?").append(idx++);
            params.add(visible);
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND title ILIKE ?").append(idx++);
            params.add("%" + keyword + "%");
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<NoticeDTO.ResponseDetail> findDetail(Long noticeId) {
        Query query = em.createNativeQuery("""
            SELECT notice_id, category, title, content, is_visible, created_at, updated_at
            FROM notices WHERE notice_id = ?1
            """);
        query.setParameter(1, noticeId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new NoticeDTO.ResponseDetail(
            ((Number) row[0]).longValue(),
            NoticeCategory.valueOf((String) row[1]),
            (String) row[2],
            (String) row[3],
            (Boolean) row[4],
            toZdt(row[5]),
            toZdt(row[6])
        ));
    }
}
