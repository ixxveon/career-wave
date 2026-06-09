package kr.co.carrer.admin.report.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

@Repository
public class ReportBoardRepository {

    @PersistenceContext
    private EntityManager em;

    public void blind(Long boardId) {
        em.createNativeQuery("UPDATE boards SET is_blind = TRUE, updated_at = NOW() WHERE board_id = ?1")
            .setParameter(1, boardId)
            .executeUpdate();
    }

    public String findTitleById(Long boardId) {
        var result = em.createNativeQuery("SELECT title FROM boards WHERE board_id = ?1")
            .setParameter(1, boardId)
            .getResultList();
        return result.isEmpty() ? null : (String) result.get(0);
    }

    public String findContentById(Long boardId) {
        var result = em.createNativeQuery("SELECT content FROM boards WHERE board_id = ?1")
            .setParameter(1, boardId)
            .getResultList();
        return result.isEmpty() ? null : (String) result.get(0);
    }
}
