package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.billing.service.EntitlementService;
import kr.co.carrer.user.billing.type.ResourceType;
import kr.co.carrer.user.resume.event.DocumentAnalysisCompletedEvent;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.type.DocumentStatus;
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

    // 방치된(종료 webhook 미수신) 분석을 타임아웃으로 자동 실패 처리하고 예약을 반환한다.
    // 스케줄러가 문서별로 호출하며, 각 호출이 독립 트랜잭션이라 한 건 실패가 다른 건에 영향을 주지 않는다.
    // 동시 webhook 과의 경합 방어: 잠금 조회 후 이미 종료 상태면 스킵(멱등).
    @Transactional
    public void failStuckDocument(UUID documentId) {
        documentRepository.findByIdForUpdate(documentId).ifPresentOrElse(
                document -> {
                    if (document.getStatus() == DocumentStatus.COMPLETED
                            || document.getStatus() == DocumentStatus.FAILED) {
                        log.info("[분석 타임아웃 처리 스킵] 이미 종료 상태 — documentId: {}, status: {}",
                                documentId, document.getStatus());
                        return;
                    }
                    document.markFailed("분석이 시간 내에 완료되지 않아 자동으로 실패 처리되었습니다. 다시 시도해주세요.");
                    entitlementService.release(ResourceType.DOCUMENT, documentId);
                    // 대기 페이지에 머문 클라이언트의 UI 스피너가 멈추지 않도록 FAILED 브로드캐스트 (트리거 실패 경로와 동일)
                    eventPublisher.publishEvent(new DocumentAnalysisCompletedEvent(documentId, "FAILED"));
                    log.warn("[분석 타임아웃 자동 실패 처리] documentId: {}", documentId);
                },
                () -> log.warn("[분석 타임아웃 처리 스킵] 문서를 찾을 수 없음. documentId: {}", documentId)
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
