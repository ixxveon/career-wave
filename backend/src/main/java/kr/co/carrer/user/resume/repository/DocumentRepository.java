package kr.co.carrer.user.resume.repository;

import kr.co.carrer.user.resume.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // IDOR 방어: documentId + memberId 동시 조건으로 DB 레벨에서 소유권 검증
    Optional<Document> findByDocumentIdAndMemberId(UUID documentId, UUID memberId);

    // 이력 목록 조회: 본인 문서만, 최신순 페이징
    Page<Document> findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable);
}
