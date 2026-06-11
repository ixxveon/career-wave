package kr.co.carrer.admin.cs.repository;

import kr.co.carrer.admin.cs.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
}
