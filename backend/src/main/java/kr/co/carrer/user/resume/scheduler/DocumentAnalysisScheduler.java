package kr.co.carrer.user.resume.scheduler;

import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.user.resume.type.DocumentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 방치된 서류 분석 정리 스케줄러.
 *
 * FastAPI 종료 webhook(COMPLETED/FAILED) 이 오지 않으면 문서는 비종료 상태(UPLOADED 등)로,
 * 이용권 예약은 RESERVED 로 영구히 남아 이후 유료 구매가 막힌다(ENTITLEMENT_INVALID_STATE).
 * 명시적 실패 경로는 이미 예약을 반환하지만, "종료 콜백 자체가 안 오는" 케이스는 이 스케줄러가 정리한다.
 * (면접 도메인의 InterviewSessionScheduler 와 동일한 패턴)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentAnalysisScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // 비종료 상태 = 예약이 아직 살아있을 수 있는 상태
    private static final List<DocumentStatus> NON_TERMINAL_STATUSES = List.of(
            DocumentStatus.UPLOADED, DocumentStatus.PENDING, DocumentStatus.ANALYZING);

    private final DocumentRepository documentRepository;
    private final DocumentStatusService documentStatusService;

    // 방치 판단 기준(분): 정상 분석 시간(수 분)을 충분히 넘는 값이어야 진행 중 분석을 오판하지 않는다.
    @Value("${resume.analysis.stuck-threshold-minutes:30}")
    private long stuckThresholdMinutes;

    // 10분 주기: 비종료 상태이면서 생성 후 threshold 이상 경과한 문서를 FAILED 처리 + 예약 반환
    @Scheduled(cron = "0 */10 * * * *")
    public void failStuckDocuments() {
        ZonedDateTime cutoff = ZonedDateTime.now(KST).minusMinutes(stuckThresholdMinutes);

        List<Document> stuck = documentRepository.findStuckDocuments(NON_TERMINAL_STATUSES, cutoff);
        if (stuck.isEmpty()) {
            return;
        }

        int successCount = 0;
        for (Document document : stuck) {
            UUID documentId = document.getDocumentId();
            try {
                // 문서별 독립 트랜잭션 — 한 건 실패가 다른 건을 막지 않도록 격리
                documentStatusService.failStuckDocument(documentId);
                successCount++;
            } catch (RuntimeException e) {
                log.error("Stuck document cleanup failed: documentId={}", documentId, e);
            }
        }

        log.info("Stuck documents auto-failed: count={}/{}", successCount, stuck.size());
    }
}
