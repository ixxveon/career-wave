package kr.co.carrer.admin.dashboard.service.impl;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.repository.DashboardQueryWindow;
import kr.co.carrer.admin.dashboard.repository.DashboardSummaryQueryRepository;
import kr.co.carrer.admin.dashboard.service.DashboardService;
import kr.co.carrer.admin.dashboard.type.DashboardAlertLevelType;
import kr.co.carrer.admin.dashboard.type.DashboardDomainType;
import kr.co.carrer.admin.dashboard.type.DashboardKpiKeyType;
import kr.co.carrer.admin.dashboard.type.DashboardPaymentMethod;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.admin.dashboard.type.DashboardSeverityType;
import kr.co.carrer.admin.dashboard.type.DashboardSystemStatusType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service("adminDashboardServiceImpl")
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final int ALERT_LIMIT = 5;
    private static final int RECENT_ACTIVITY_LIMIT = 5;

    private final ObjectProvider<DashboardSummaryQueryRepository> dashboardSummaryQueryRepositoryProvider;

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.ResponseSummary getSummary(DashboardDTO.RequestSummary request) {
        DashboardRangeType range = resolveRange(request);
        ZonedDateTime baseDateTime = ZonedDateTime.now(ZoneOffset.UTC);
        DashboardQueryWindow queryWindow = DashboardQueryWindow.of(range, baseDateTime);
        DashboardSummaryQueryRepository queryRepository = getQueryRepository();

        DashboardSummaryQueryRepository.AdminAccountMetrics adminMetrics =
                queryRepository.fetchAdminAccountMetrics(queryWindow);
        DashboardSummaryQueryRepository.AiUsageMetrics aiUsageMetrics =
                queryRepository.fetchAiUsageMetrics(queryWindow);
        DashboardSummaryQueryRepository.RagDocumentMetrics ragDocumentMetrics =
                queryRepository.fetchRagDocumentMetrics(queryWindow);
        DashboardSummaryQueryRepository.ScrapingStatusMetrics scrapingStatusMetrics =
                queryRepository.fetchScrapingStatusMetrics(queryWindow);

        List<DashboardDTO.Alert> alerts = buildAlerts(
                queryRepository.findAuditAlerts(queryWindow, ALERT_LIMIT),
                queryRepository.findScrapingAlerts(queryWindow, ALERT_LIMIT)
        );

        return new DashboardDTO.ResponseSummary(
                baseDateTime,
                range,
                buildKpis(adminMetrics, aiUsageMetrics),
                alerts,
                List.of(),
                validatePaymentRatio(buildPaymentRatio()),
                buildServiceCards(adminMetrics, aiUsageMetrics, scrapingStatusMetrics, alerts.size()),
                buildSystemStatus(aiUsageMetrics, ragDocumentMetrics, scrapingStatusMetrics),
                buildRecentActivities(queryRepository.findRecentActivities(queryWindow, RECENT_ACTIVITY_LIMIT))
        );
    }

    private DashboardRangeType resolveRange(DashboardDTO.RequestSummary request) {
        if (request == null || request.range() == null) {
            return DashboardRangeType.TODAY;
        }

        return request.range();
    }

    private DashboardSummaryQueryRepository getQueryRepository() {
        DashboardSummaryQueryRepository queryRepository = dashboardSummaryQueryRepositoryProvider.getIfAvailable();
        if (queryRepository == null) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Dashboard query repository is not available.");
        }

        return queryRepository;
    }

    private List<DashboardDTO.Kpi> buildKpis(
            DashboardSummaryQueryRepository.AdminAccountMetrics adminMetrics,
            DashboardSummaryQueryRepository.AiUsageMetrics aiUsageMetrics
    ) {
        long newAdminCount = adminMetrics == null ? 0L : adminMetrics.newAdminCount();
        long activeAdminCount = adminMetrics == null ? 0L : adminMetrics.activeAdminCount();
        long recentLoginCount = adminMetrics == null ? 0L : adminMetrics.recentLoginCount();
        long interviewSessionCount = aiUsageMetrics == null ? 0L : aiUsageMetrics.interviewSessionCount();
        BigDecimal todayRevenue = aiUsageMetrics == null ? BigDecimal.ZERO : aiUsageMetrics.todayRevenue();
        long revenue = todayRevenue == null ? 0L : todayRevenue.longValue();

        return List.of(
                new DashboardDTO.Kpi(
                        DashboardKpiKeyType.TODAY_NEW_MEMBERS,
                        "오늘 신규 가입자",
                        newAdminCount,
                        "명",
                        "선택 기간 기준",
                        DashboardSeverityType.NORMAL,
                        "/admin/admins"
                ),
                new DashboardDTO.Kpi(
                        DashboardKpiKeyType.REALTIME_ACTIVE_USERS,
                        "실시간 활성 관리자",
                        activeAdminCount,
                        "명",
                        "최근 로그인 " + recentLoginCount + "명",
                        DashboardSeverityType.NORMAL,
                        "/admin/admins"
                ),
                new DashboardDTO.Kpi(
                        DashboardKpiKeyType.AI_INTERVIEW_SESSIONS,
                        "AI 인터뷰 세션",
                        interviewSessionCount,
                        "건",
                        "선택 기간 기준",
                        DashboardSeverityType.NORMAL,
                        "/admin/ai"
                ),
                new DashboardDTO.Kpi(
                        DashboardKpiKeyType.TODAY_REVENUE,
                        "오늘 매출",
                        revenue,
                        "원",
                        "카드 결제 기준",
                        DashboardSeverityType.NORMAL,
                        "/admin/payments"
                )
        );
    }

    private List<DashboardDTO.Alert> buildAlerts(
            List<DashboardSummaryQueryRepository.AuditAlertRow> auditAlerts,
            List<DashboardSummaryQueryRepository.ScrapingAlertRow> scrapingAlerts
    ) {
        List<DashboardDTO.Alert> alerts = new ArrayList<>();

        emptyIfNull(auditAlerts).stream()
                .map(row -> new DashboardDTO.Alert(
                        row.id(),
                        DashboardAlertLevelType.WARNING,
                        DashboardDomainType.AUDIT_LOG,
                        row.title(),
                        row.message(),
                        "/admin/log",
                        row.createdAt()
                ))
                .forEach(alerts::add);

        emptyIfNull(scrapingAlerts).stream()
                .map(row -> new DashboardDTO.Alert(
                        row.id(),
                        DashboardAlertLevelType.URGENT,
                        DashboardDomainType.SCRAPING,
                        row.title(),
                        row.message(),
                        "/admin/scraping",
                        row.createdAt()
                ))
                .forEach(alerts::add);

        return alerts.stream()
                .limit(ALERT_LIMIT)
                .toList();
    }

    private List<DashboardDTO.PaymentRatio> buildPaymentRatio() {
        return List.of(new DashboardDTO.PaymentRatio(
                DashboardPaymentMethod.CARD,
                "카드",
                100
        ));
    }

    private List<DashboardDTO.ServiceCard> buildServiceCards(
            DashboardSummaryQueryRepository.AdminAccountMetrics adminMetrics,
            DashboardSummaryQueryRepository.AiUsageMetrics aiUsageMetrics,
            DashboardSummaryQueryRepository.ScrapingStatusMetrics scrapingStatusMetrics,
            int alertCount
    ) {
        long newAdminCount = adminMetrics == null ? 0L : adminMetrics.newAdminCount();
        long interviewSessionCount = aiUsageMetrics == null ? 0L : aiUsageMetrics.interviewSessionCount();
        long runningPipelineCount = scrapingStatusMetrics == null ? 0L : scrapingStatusMetrics.runningPipelineCount();

        return List.of(
                new DashboardDTO.ServiceCard(
                        "ADMIN",
                        "관리자 관리",
                        "관리자 계정과 권한을 관리합니다.",
                        "신규 " + newAdminCount + "명",
                        "/admin/admins"
                ),
                new DashboardDTO.ServiceCard(
                        "AI_METRICS",
                        "AI Metrics",
                        "AI 사용량과 RAG 문서 상태를 확인합니다.",
                        "세션 " + interviewSessionCount + "건",
                        "/admin/ai"
                ),
                new DashboardDTO.ServiceCard(
                        "SCRAPING",
                        "스크래핑 관리",
                        "채용 공고 수집 파이프라인 상태를 확인합니다.",
                        "실행중 " + runningPipelineCount + "개",
                        "/admin/scraping"
                ),
                new DashboardDTO.ServiceCard(
                        "AUDIT_LOG",
                        "감사 로그",
                        "관리자 활동과 시스템 변경 이력을 확인합니다.",
                        "알림 " + alertCount + "건",
                        "/admin/log"
                )
        );
    }

    private List<DashboardDTO.SystemStatus> buildSystemStatus(
            DashboardSummaryQueryRepository.AiUsageMetrics aiUsageMetrics,
            DashboardSummaryQueryRepository.RagDocumentMetrics ragDocumentMetrics,
            DashboardSummaryQueryRepository.ScrapingStatusMetrics scrapingStatusMetrics
    ) {
        boolean aiWarning = aiUsageMetrics != null
                && (!aiUsageMetrics.alertEnabled() || !aiUsageMetrics.rateLimitEnabled());
        long totalDocumentCount = ragDocumentMetrics == null ? 0L : ragDocumentMetrics.totalDocumentCount();
        long failedDocumentCount = ragDocumentMetrics == null ? 0L : ragDocumentMetrics.failedDocumentCount();
        long failedPipelineCount = scrapingStatusMetrics == null ? 0L : scrapingStatusMetrics.failedPipelineCount();
        long runningPipelineCount = scrapingStatusMetrics == null ? 0L : scrapingStatusMetrics.runningPipelineCount();

        return List.of(
                new DashboardDTO.SystemStatus(
                        "AI_API",
                        "AI API",
                        aiWarning ? DashboardSystemStatusType.WARNING : DashboardSystemStatusType.NORMAL,
                        aiWarning ? "설정 확인 필요" : "정상"
                ),
                new DashboardDTO.SystemStatus(
                        "RAG_DOCUMENT",
                        "RAG 문서",
                        failedDocumentCount > 0 ? DashboardSystemStatusType.WARNING : DashboardSystemStatusType.NORMAL,
                        "전체 " + totalDocumentCount + "건 / 실패 " + failedDocumentCount + "건"
                ),
                new DashboardDTO.SystemStatus(
                        "SCRAPING_PIPELINE",
                        "스크래핑 파이프라인",
                        resolveScrapingStatus(failedPipelineCount, runningPipelineCount),
                        "실행중 " + runningPipelineCount + "개 / 실패 " + failedPipelineCount + "개"
                )
        );
    }

    private DashboardSystemStatusType resolveScrapingStatus(long failedPipelineCount, long runningPipelineCount) {
        if (failedPipelineCount > 0) {
            return DashboardSystemStatusType.CRITICAL;
        }
        if (runningPipelineCount > 0) {
            return DashboardSystemStatusType.WARNING;
        }

        return DashboardSystemStatusType.NORMAL;
    }

    private List<DashboardDTO.RecentActivity> buildRecentActivities(
            List<DashboardSummaryQueryRepository.RecentActivityRow> recentActivities
    ) {
        return emptyIfNull(recentActivities).stream()
                .map(row -> new DashboardDTO.RecentActivity(
                        row.id(),
                        row.occurredAt(),
                        row.adminLoginId(),
                        row.message(),
                        row.targetPath()
                ))
                .toList();
    }

    private List<DashboardDTO.PaymentRatio> validatePaymentRatio(List<DashboardDTO.PaymentRatio> paymentRatio) {
        int totalRatio = emptyIfNull(paymentRatio).stream()
                .mapToInt(DashboardDTO.PaymentRatio::ratio)
                .sum();

        if (totalRatio != 100) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "Dashboard payment ratio total must be 100.");
        }

        return paymentRatio;
    }

    private <T> List<T> emptyIfNull(List<T> source) {
        return source == null ? List.of() : source;
    }
}
