package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.resume.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentStatusService {

    private final DocumentRepository documentRepository;

    @Transactional
    public void markFailed(UUID documentId, String errorMessage) {
        documentRepository.findById(documentId).ifPresentOrElse(
                doc -> {
                    doc.markFailed(errorMessage);
                    log.warn("[분석 실패 마킹] documentId: {}, 원인: {}", documentId, errorMessage);
                },
                () -> log.warn("[분석 실패 마킹 스킵] 문서를 찾을 수 없음. documentId: {}", documentId)
        );
    }
}
