package kr.co.carrer.user.support.repository;

import kr.co.carrer.user.support.entity.SupportFaq;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFaqRepository extends JpaRepository<SupportFaq, Long> {
}
