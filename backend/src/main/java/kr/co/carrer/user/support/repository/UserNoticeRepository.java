package kr.co.carrer.user.support.repository;

import kr.co.carrer.user.support.entity.SupportNotice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNoticeRepository extends JpaRepository<SupportNotice, Long> {
}
