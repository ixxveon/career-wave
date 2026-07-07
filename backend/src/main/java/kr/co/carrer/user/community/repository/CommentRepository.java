package kr.co.carrer.user.community.repository;

import kr.co.carrer.user.community.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByBoardIdAndBlindFalseOrderByCreatedAtAsc(Long boardId);
}