package kr.co.carrer.admin.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import kr.co.carrer.admin.report.exception.AdminReportErrorCode;
import kr.co.carrer.global.exception.CustomException;
import org.springframework.stereotype.Repository;

@Repository
public class ReportCommentRepository {

    @PersistenceContext
    private EntityManager em;

    public void blind(Long commentId) {
        int updated = em.createNativeQuery("UPDATE comments SET is_blind = TRUE, updated_at = NOW() WHERE comment_id = ?1")
            .setParameter(1, commentId)
            .executeUpdate();
        if (updated == 0) {
            throw new CustomException(AdminReportErrorCode.COMMENT_NOT_FOUND);
        }
    }

    public String findContentById(Long commentId) {
        var result = em.createNativeQuery("SELECT content FROM comments WHERE comment_id = ?1")
            .setParameter(1, commentId)
            .getResultList();
        return result.isEmpty() ? null : (String) result.get(0);
    }

    public boolean isBlind(Long commentId) {
        var result = em.createNativeQuery("SELECT is_blind FROM comments WHERE comment_id = ?1")
            .setParameter(1, commentId)
            .getResultList();
        return !result.isEmpty() && Boolean.TRUE.equals(result.get(0));
    }
}
