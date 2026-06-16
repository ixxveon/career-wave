package kr.co.carrer.admin.cs.repository;

import kr.co.carrer.admin.cs.entity.Inquiry;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    long countByInquiryStatus(InquiryStatus status);
}
