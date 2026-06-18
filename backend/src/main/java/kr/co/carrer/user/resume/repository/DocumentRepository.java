package kr.co.carrer.user.resume.repository;

import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // IDOR 방어: documentId + memberId 동시 조건으로 DB 레벨에서 소유권 검증
    Optional<Document> findByDocumentIdAndMemberId(UUID documentId, UUID memberId);

    // 이력 목록 조회: 본인 문서 + cover_letter_meta LEFT JOIN + document_feedbacks LEFT JOIN
    @Query("""
            SELECT new kr.co.carrer.user.resume.dto.ResumeDTO$HistoryItem(
                d.documentId,
                d.fileType,
                d.status,
                d.originalName,
                m.company,
                m.job,
                f.scoreTotal,
                d.createdAt
            )
            FROM Document d
            LEFT JOIN CoverLetterMeta m ON m.documentId = d.documentId
            LEFT JOIN DocumentFeedback f ON f.documentId = d.documentId
            WHERE d.memberId = :memberId
            ORDER BY d.createdAt DESC, d.documentId DESC
            """)
    Page<ResumeDTO.HistoryItem> findHistoryByMemberId(@Param("memberId") UUID memberId, Pageable pageable);

    // 이번 달 분석 사용 횟수 (FAILED 제외)
    @Query("""
            SELECT COUNT(d)
            FROM Document d
            WHERE d.memberId = :memberId
              AND d.status <> kr.co.carrer.user.resume.type.DocumentStatus.FAILED
              AND d.createdAt >= :from
            """)
    int countUsedThisMonth(@Param("memberId") UUID memberId, @Param("from") ZonedDateTime from);
}
