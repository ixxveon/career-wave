package kr.co.carrer.admin.aimetrics.repository;

import kr.co.carrer.admin.aimetrics.entity.RagDocument;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RagDocumentRepository extends JpaRepository<RagDocument, Long> {

    Page<RagDocument> findAll(Pageable pageable);

    Page<RagDocument> findByStatus(RagDocumentStatusType status, Pageable pageable);

    boolean existsByStatus(RagDocumentStatusType status);
}
