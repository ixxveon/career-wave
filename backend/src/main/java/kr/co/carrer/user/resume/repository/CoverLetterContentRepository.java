package kr.co.carrer.user.resume.repository;

import kr.co.carrer.user.resume.entity.CoverLetterContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CoverLetterContentRepository extends JpaRepository<CoverLetterContent, Long> {

    List<CoverLetterContent> findByDocumentIdOrderByOrderNum(UUID documentId);
}
