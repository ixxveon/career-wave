package kr.co.carrer.user.support.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.service.UserFaqService;
import kr.co.carrer.user.support.type.FaqCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserFaqServiceImpl implements UserFaqService {

    @PersistenceContext
    private EntityManager em;

    private ZonedDateTime toZdt(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atZone(ZoneId.systemDefault());
        if (value instanceof java.time.Instant i) return i.atZone(ZoneId.systemDefault());
        if (value instanceof java.time.OffsetDateTime odt) return odt.toZonedDateTime();
        throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupportDTO.FaqItem> getFaqs(FaqCategory category, String keyword) {
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
            sql.append(" AND (question ILIKE ?").append(idx).append(" OR answer ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
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
