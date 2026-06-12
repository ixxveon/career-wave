package kr.co.carrer.admin.cs.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.entity.Faq;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.FaqRepository;
import kr.co.carrer.admin.cs.service.AdminFaqService;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminFaqServiceImpl implements AdminFaqService {

    private final FaqRepository faqRepository;

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
    public PaginationResponse<FaqDTO.ResponseList> getFaqs(FaqCategory category, int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);
        int offset = (page - 1) * size;

        StringBuilder sql = new StringBuilder("SELECT faq_id, category, question, created_at FROM faqs WHERE 1=1");
        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (category != null) {
            sql.append(" AND category = ?").append(idx++);
            params.add(category.name());
        }
        sql.append(" ORDER BY created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) query.setParameter(i + 1, params.get(i));

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<FaqDTO.ResponseList> items = new ArrayList<>();
        for (Object[] row : rows) {
            items.add(new FaqDTO.ResponseList(
                ((Number) row[0]).longValue(),
                FaqCategory.valueOf((String) row[1]),
                (String) row[2],
                toZdt(row[3])
            ));
        }

        StringBuilder countSql = new StringBuilder("SELECT COUNT(*) FROM faqs WHERE 1=1");
        List<Object> countParams = new ArrayList<>();
        int ci = 1;
        if (category != null) {
            countSql.append(" AND category = ?").append(ci++);
            countParams.add(category.name());
        }
        Query countQuery = em.createNativeQuery(countSql.toString());
        for (int i = 0; i < countParams.size(); i++) countQuery.setParameter(i + 1, countParams.get(i));
        long total = ((Number) countQuery.getSingleResult()).longValue();

        return PaginationResponse.of(items, page, size, total);
    }

    @Override
    @Transactional
    public FaqDTO.ResponseResult createFaq(FaqDTO.RequestCreate dto, Long adminId) {
        Faq faq = Faq.create(adminId, dto.category(), dto.question(), dto.answer());
        faqRepository.save(faq);
        return new FaqDTO.ResponseResult(faq.getFaqId(), null);
    }

    @Override
    @Transactional
    public FaqDTO.ResponseResult updateFaq(Long faqId, FaqDTO.RequestUpdate dto) {
        Faq faq = faqRepository.findById(faqId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.FAQ_NOT_FOUND));
        faq.update(dto.category(), dto.question(), dto.answer());
        em.flush();
        return new FaqDTO.ResponseResult(faq.getFaqId(), faq.getUpdatedAt());
    }

    @Override
    @Transactional
    public void deleteFaq(Long faqId) {
        Faq faq = faqRepository.findById(faqId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.FAQ_NOT_FOUND));
        faqRepository.delete(faq);
    }
}
