package kr.co.carrer.user.community.repository;

import kr.co.carrer.user.community.entity.Board;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, Long> {

    Page<Board> findByBlindFalse(Pageable pageable);

    Page<Board> findByCategoryAndBlindFalse(String category, Pageable pageable);
}
