package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.TermsDocument;
import kr.co.carrer.user.member.entity.TermsDocumentId;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface TermsDocumentRepository extends JpaRepository<TermsDocument, TermsDocumentId> {

    @Query("SELECT t FROM TermsDocument t WHERE t.documentCode = :code AND t.effectiveFrom <= :now ORDER BY t.effectiveFrom DESC LIMIT 1")
    Optional<TermsDocument> findLatestEffective(
            @Param("code") TermsDocumentCode code,
            @Param("now") Instant now
    );
}
