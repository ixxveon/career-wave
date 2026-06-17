package kr.co.carrer.user.support.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.NoticeCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class UserNoticeQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.Instant i) return i.atZone(ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.OffsetDateTime odt) return odt.atZoneSameInstant(ZoneId.of("Asia/Seoul"));
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<SupportDTO.NoticeList> findNotices(NoticeCategory category, String keyword, int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT notice_id, category, title, is_pinned, view_count, created_at
            FROM notices
            WHERE is_visible = true
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (title ILIKE ?").append(idx)
               .append(" OR content ILIKE ?").append(idx + 1).append(")");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
            idx += 2;
        }

        sql.append(" ORDER BY is_pinned DESC, created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<SupportDTO.NoticeList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new SupportDTO.NoticeList(
                ((Number) row[0]).longValue(),
                NoticeCategory.valueOf((String) row[1]),
                (String) row[2],
                (Boolean) row[3],
                ((Number) row[4]).intValue(),
                toZdt(row[5])
            ));
        }
        return result;
    }

    public long countNotices(NoticeCategory category, String keyword) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM notices WHERE is_visible = true");
        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (title ILIKE ?").append(idx)
               .append(" OR content ILIKE ?").append(idx + 1).append(")");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
            idx += 2;
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<SupportDTO.NoticeDetail> findDetail(Long noticeId) {
        Query query = em.createNativeQuery("""
            SELECT notice_id, category, title, content, is_pinned, view_count, created_at, updated_at
            FROM notices
            WHERE notice_id = ?1 AND is_visible = true
            """);
        query.setParameter(1, noticeId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        long id = ((Number) row[0]).longValue();

        SupportDTO.NoticeDetail.PrevNext prev = findAdjacentNotice(id, "prev");
        SupportDTO.NoticeDetail.PrevNext next = findAdjacentNotice(id, "next");

        return Optional.of(new SupportDTO.NoticeDetail(
            id,
            NoticeCategory.valueOf((String) row[1]),
            (String) row[2],
            (String) row[3],
            (Boolean) row[4],
            ((Number) row[5]).intValue(),
            toZdt(row[6]),
            toZdt(row[7]),
            prev,
            next
        ));
    }

    private SupportDTO.NoticeDetail.PrevNext findAdjacentNotice(Long noticeId, String direction) {
        String condition = direction.equals("prev") ? "notice_id < ?1" : "notice_id > ?1";
        String order = direction.equals("prev") ? "DESC" : "ASC";

        Query q = em.createNativeQuery(
            "SELECT notice_id, title FROM notices WHERE is_visible = true AND " + condition
            + " ORDER BY notice_id " + order + " LIMIT 1"
        );
        q.setParameter(1, noticeId);

        List<?> rows = q.getResultList();
        if (rows.isEmpty()) return null;

        Object[] row = (Object[]) rows.get(0);
        return new SupportDTO.NoticeDetail.PrevNext(
            ((Number) row[0]).longValue(),
            (String) row[1]
        );
    }
}
