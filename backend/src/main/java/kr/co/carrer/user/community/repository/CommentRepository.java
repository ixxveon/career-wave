package kr.co.carrer.user.community.repository;

import kr.co.carrer.user.community.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByBoardIdAndBlindFalseOrderByCreatedAtAsc(Long boardId);

    long countByBoardIdAndBlindFalse(Long boardId);

    @Query("SELECT c.boardId, COUNT(c) FROM Comment c "
            + "WHERE c.blind = false AND c.boardId IN :boardIds "
            + "GROUP BY c.boardId")
    List<Object[]> countGroupedByBoardId(@Param("boardIds") Collection<Long> boardIds);
}