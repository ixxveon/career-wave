package kr.co.carrer.admin.report.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.admin.report.entity.Report;
import kr.co.carrer.admin.report.repository.ReportBoardRepository;
import kr.co.carrer.admin.report.repository.ReportCommentRepository;
import kr.co.carrer.admin.report.repository.ReportQueryRepository;
import kr.co.carrer.admin.report.repository.ReportRepository;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;
import kr.co.carrer.admin.report.exception.AdminReportErrorCode;
import kr.co.carrer.admin.report.service.AdminReportService;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminReportServiceImpl implements AdminReportService {

    private final ReportRepository reportRepository;
    private final ReportQueryRepository reportQueryRepository;
    private final ReportBoardRepository reportBoardRepository;
    private final ReportCommentRepository reportCommentRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    // 트랜잭션 분리를 위한 self-injection — readOnly 읽기 / 쓰기 트랜잭션을 각각 프록시로 실행
    @Lazy
    @Autowired
    private AdminReportServiceImpl self;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    @Value("${webhook.secret}")
    private String webhookSecret;

    private static final Duration AI_TIMEOUT = Duration.ofSeconds(10);
    private static final String REPORT_ANALYSIS_PATH = "/api/v1/ai/report-analysis";
    private static final String MEMBER_ANALYSIS_PATH = "/api/v1/ai/member-analysis";

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(fastApiBaseUrl).build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReportDetailDTO.ResponseSummary getSummary() {
        long totalCount    = reportRepository.count();
        long pendingCount  = reportRepository.countByReportStatus(ReportStatus.PENDING);
        long blindedCount  = reportRepository.countByReportStatus(ReportStatus.BLINDED);
        long highRiskCount = reportRepository.countHighRisk();
        return new ReportDetailDTO.ResponseSummary(totalCount, pendingCount, blindedCount, highRiskCount);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<ReportDetailDTO.ResponseList> getReports(ReportStatus status, TargetType targetType,
                                                                        ReportReason reason, String keyword,
                                                                        int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(kr.co.carrer.global.exception.ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);
        int offset = (page - 1) * size;

        List<ReportDetailDTO.ResponseList> items =
            reportQueryRepository.findReports(status, targetType, reason, keyword, offset, size);
        long total = reportQueryRepository.countReports(status, targetType, reason, keyword);

        return PaginationResponse.of(items, page, size, total);
    }

    /**
     * 논트랜잭션 오케스트레이터:
     * 1) readOnly 트랜잭션으로 데이터 조회 (self.readReportDetail)
     * 2) 트랜잭션 종료 후 FastAPI HTTP 호출 — DB 커넥션 미점유
     * 3) 결과를 독립된 쓰기 트랜잭션으로 저장 (self.persistAiSuggestion)
     */
    @Override
    public ReportDetailDTO.ResponseDetail getReportDetail(Long reportId, Long adminId) {
        ReportDetailDTO.ResponseDetail detail = self.readReportDetail(reportId);

        String aiSuggestion = detail.aiSuggestion();
        if (aiSuggestion == null) {
            aiSuggestion = callFastApiForAiSuggestion(
                reportId, adminId, detail.targetType(), detail.reason(),
                detail.contentTitle(), detail.contentBody()
            );
            if (aiSuggestion != null) {
                self.persistAiSuggestion(reportId, aiSuggestion);
            }
        }

        return new ReportDetailDTO.ResponseDetail(
            detail.reportId(), detail.targetType(), detail.targetId(),
            detail.reason(), detail.reportStatus(),
            detail.reporterName(), detail.reportedName(),
            detail.contentTitle(), detail.contentBody(), aiSuggestion,
            detail.createdAt(), detail.processedAt(), detail.processedBy(),
            detail.memberId()
        );
    }

    @Transactional(readOnly = true)
    public ReportDetailDTO.ResponseDetail readReportDetail(Long reportId) {
        ReportDetailDTO.ResponseDetail base = reportQueryRepository.findReportDetail(reportId)
            .orElseThrow(() -> new CustomException(AdminReportErrorCode.REPORT_NOT_FOUND));

        String contentTitle = null;
        String contentBody  = null;

        if (base.targetType() == TargetType.BOARD) {
            contentTitle = reportBoardRepository.findTitleById(base.targetId());
            contentBody  = reportBoardRepository.findContentById(base.targetId());
        } else if (base.targetType() == TargetType.COMMENT) {
            contentBody = reportCommentRepository.findContentById(base.targetId());
        }

        return new ReportDetailDTO.ResponseDetail(
            base.reportId(), base.targetType(), base.targetId(),
            base.reason(), base.reportStatus(),
            base.reporterName(), base.reportedName(),
            contentTitle, contentBody, base.aiSuggestion(),
            base.createdAt(), base.processedAt(), base.processedBy(),
            base.memberId()
        );
    }

    @Transactional
    public void persistAiSuggestion(Long reportId, String aiSuggestion) {
        reportRepository.findById(reportId)
            .ifPresent(report -> report.updateAiSuggestion(aiSuggestion));
    }

    private String callFastApiForAiSuggestion(Long reportId, Long adminId, TargetType targetType, ReportReason reason,
                                               String contentTitle, String contentBody) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("targetType", targetType.name());
            body.put("reason", reason.name());
            body.put("contentTitle", contentTitle);
            body.put("contentBody", contentBody);
            body.put("adminId", adminId);

            Map<?, ?> response = webClient.post()
                .uri(REPORT_ANALYSIS_PATH)
                .header("X-Internal-Secret", webhookSecret)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(AI_TIMEOUT)
                .block();

            if (response == null) return null;
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            log.warn("[ReportAI] FastAPI 호출 실패 — reportId={}, 원인={}", reportId, e.getMessage());
            return null;
        }
    }

    @Override
    public ReportDetailDTO.ResponseMemberAiReview getMemberAiReview(Long reportId, Long adminId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new CustomException(AdminReportErrorCode.REPORT_NOT_FOUND));

        ReportQueryRepository.MemberSummary memberSummary = reportQueryRepository.findMemberSummaryByReportId(reportId)
            .orElseThrow(() -> new CustomException(AdminReportErrorCode.REPORT_NOT_FOUND));

        int warningCount = memberSummary.warningCount();
        long reportCount = memberSummary.reportCount();
        String memberStatus = memberSummary.memberStatus();

        Map<?, ?> aiResult = callFastApiForMemberAnalysis(
            reportId, adminId, warningCount, reportCount, memberStatus, report.getReason()
        );

        if (aiResult == null) {
            String riskLevel = reportCount >= 5 ? "높음" : reportCount >= 3 ? "중간" : "낮음";
            String recommendation = warningCount >= 3 ? "BLACKLIST"
                : warningCount >= 2 ? "SUSPEND"
                : reportCount >= 3 ? "WARNING" : "NONE";
            String summary = String.format("AI 분석 서버에 연결할 수 없어 규칙 기반으로 산출했습니다. 경고 %d회, 신고 %d건.", warningCount, reportCount);
            return new ReportDetailDTO.ResponseMemberAiReview(reportCount, warningCount, riskLevel, recommendation, summary);
        }

        return new ReportDetailDTO.ResponseMemberAiReview(
            reportCount,
            warningCount,
            (String) aiResult.get("riskLevel"),
            (String) aiResult.get("recommendation"),
            (String) aiResult.get("summary")
        );
    }

    private Map<?, ?> callFastApiForMemberAnalysis(Long reportId, Long adminId, int warningCount,
                                                    long reportCount, String memberStatus, ReportReason reason) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("warningCount", warningCount);
            body.put("reportCount", reportCount);
            body.put("memberStatus", memberStatus);
            body.put("reason", reason.name());
            body.put("adminId", adminId);

            return webClient.post()
                .uri(MEMBER_ANALYSIS_PATH)
                .header("X-Internal-Secret", webhookSecret)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(AI_TIMEOUT)
                .block();
        } catch (Exception e) {
            log.warn("[ReportAI] Member analysis FastAPI 호출 실패 — reportId={}, 원인={}", reportId, e.getMessage());
            return null;
        }
    }

    @Override
    @Transactional
    public ReportDetailDTO.ResponseProcess blindReport(Long reportId, Long adminId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new CustomException(AdminReportErrorCode.REPORT_NOT_FOUND));

        if (report.getReportStatus() != ReportStatus.PENDING) {
            throw new CustomException(AdminReportErrorCode.ALREADY_PROCESSED);
        }

        if (report.getTargetType() == TargetType.BOARD) {
            reportBoardRepository.blind(report.getTargetId());
        } else if (report.getTargetType() == TargetType.COMMENT) {
            reportCommentRepository.blind(report.getTargetId());
        }

        report.blind(adminId);

        return new ReportDetailDTO.ResponseProcess(
            report.getReportId(), report.getReportStatus(), report.getProcessedAt()
        );
    }

    @Override
    @Transactional
    public ReportDetailDTO.ResponseProcess dismissReport(Long reportId, Long adminId) {
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new CustomException(AdminReportErrorCode.REPORT_NOT_FOUND));

        if (report.getReportStatus() != ReportStatus.PENDING) {
            throw new CustomException(AdminReportErrorCode.ALREADY_PROCESSED);
        }

        report.dismiss(adminId);

        return new ReportDetailDTO.ResponseProcess(
            report.getReportId(), report.getReportStatus(), report.getProcessedAt()
        );
    }
}
