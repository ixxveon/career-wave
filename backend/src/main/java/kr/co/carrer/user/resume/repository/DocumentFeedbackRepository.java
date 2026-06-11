package kr.co.carrer.user.resume.repository;

import kr.co.carrer.user.resume.entity.DocumentFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DocumentFeedbackRepository extends JpaRepository<DocumentFeedback, Long> {

    Optional<DocumentFeedback> findByDocumentId(UUID documentId);
}
