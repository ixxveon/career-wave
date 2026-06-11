package kr.co.carrer.user.resume.repository;

import kr.co.carrer.user.resume.entity.CoverLetterMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CoverLetterMetaRepository extends JpaRepository<CoverLetterMeta, Long> {

    Optional<CoverLetterMeta> findByDocumentId(UUID documentId);
}
