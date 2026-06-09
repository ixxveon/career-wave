package kr.co.carrer.admin.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

@Repository
public class ReportCommentRepository {

    @PersistenceContext
    private EntityManager em;

    public void blind(Long commentId) {
        em.createNativeQuery("UPDATE comments SET is_blind = TRUE, updated_at = NOW() WHERE comment_id = ?1")
            .setParameter(1, commentId)
            .executeUpdate();
    }

    public String findContentById(Long commentId) {
        var result = em.createNativeQuery("SELECT content FROM comments WHERE comment_id = ?1")
            .setParameter(1, commentId)
            .getResultList();
        return result.isEmpty() ? null : (String) result.get(0);
    }
}
