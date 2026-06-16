package kr.co.carrer.admin.aiMetrics.repository;

import kr.co.carrer.admin.aiMetrics.entity.RagDocument;
import kr.co.carrer.admin.aiMetrics.type.RagDocumentStatusType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RagDocumentRepository extends JpaRepository<RagDocument, Long> {

    Page<RagDocument> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<RagDocument> findByStatusOrderByCreatedAtDesc(RagDocumentStatusType status, Pageable pageable);
}
