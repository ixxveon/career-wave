package kr.co.carrer.admin.cs.repository;

import kr.co.carrer.admin.cs.entity.Faq;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqRepository extends JpaRepository<Faq, Long> {
}
