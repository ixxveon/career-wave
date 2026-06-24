package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
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
    private final EntitlementService entitlementService;

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

    @Transactional
    public void handleAnalysisTriggerFailure(UUID documentId, String errorMessage) {
        documentRepository.findById(documentId).ifPresentOrElse(
                document -> {
                    document.markFailed(errorMessage);
                    entitlementService.release(ResourceType.DOCUMENT, documentId);
                    log.warn("[분석 트리거 실패 처리] documentId: {}, 원인: {}", documentId, errorMessage);
                },
                () -> log.warn("[분석 트리거 실패 처리 스킵] 문서를 찾을 수 없음. documentId: {}", documentId)
        );
    }
}
