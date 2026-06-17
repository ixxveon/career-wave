package kr.co.carrer.user.support.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.FaqCategory;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class UserFaqQueryRepository {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.Instant i) return i.atZone(ZoneId.of("Asia/Seoul"));
        if (value instanceof java.time.OffsetDateTime odt) return odt.atZoneSameInstant(ZoneId.of("Asia/Seoul"));
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    public List<SupportDTO.FaqItem> findFaqs(FaqCategory category, String keyword) {
        StringBuilder sql = new StringBuilder(
            "SELECT faq_id, category, question, answer, created_at FROM faqs WHERE 1=1"
        );
        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (question ILIKE ?").append(idx)
               .append(" OR answer ILIKE ?").append(idx + 1).append(")");
            params.add("%" + keyword + "%");
            params.add("%" + keyword + "%");
            idx += 2;
        }

        sql.append(" ORDER BY created_at ASC");

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<SupportDTO.FaqItem> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new SupportDTO.FaqItem(
                ((Number) row[0]).longValue(),
                FaqCategory.valueOf((String) row[1]),
                (String) row[2],
                (String) row[3],
                toZdt(row[4])
            ));
        }
        return result;
    }
}
