package kr.co.carrer.user.support.repository;

import kr.co.carrer.user.support.entity.SupportInquiry;
import kr.co.carrer.user.support.type.InquiryCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface UserInquiryRepository extends JpaRepository<SupportInquiry, Long> {

    @Query("""
        SELECT i FROM SupportInquiry i
        WHERE i.memberId = :memberId
        AND (:category IS NULL OR i.category = :category)
        ORDER BY i.createdAt DESC
        """)
    Page<SupportInquiry> findByMemberIdAndCategory(
        @Param("memberId") UUID memberId,
        @Param("category") InquiryCategory category,
        Pageable pageable
    );
}
