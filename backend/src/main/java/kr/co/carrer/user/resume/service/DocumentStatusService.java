package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentStatusService {

    private final DocumentRepository documentRepository;
    private final EntitlementService entitlementService;
    private final ApplicationEventPublisher eventPublisher;

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
    public void handleAnalysisTriggerFailure(UUID documentId, String internalReason) {
        documentRepository.findById(documentId).ifPresentOrElse(
                document -> {
                    document.markFailed("분석 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                    entitlementService.release(ResourceType.DOCUMENT, documentId);
                    log.warn("[분석 트리거 실패 처리] documentId: {}, 원인: {}", documentId, internalReason);
                    // 트리거 실패도 Webhook 실패 경로와 동일하게 FAILED 이벤트 발행 → WebSocket 브로드캐스트
                    eventPublisher.publishEvent(new DocumentAnalysisCompletedEvent(documentId, "FAILED"));
                },
                () -> log.warn("[분석 트리거 실패 처리 스킵] 문서를 찾을 수 없음. documentId: {}", documentId)
        );
    }
}
