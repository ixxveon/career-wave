package kr.co.carrer.admin.report.service.impl;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminReportServiceImpl implements AdminReportService {

    private final ReportRepository reportRepository;
    private final ReportQueryRepository reportQueryRepository;
    private final ReportBoardRepository reportBoardRepository;
    private final ReportCommentRepository reportCommentRepository;

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

    @Override
    @Transactional(readOnly = true)
    public ReportDetailDTO.ResponseDetail getReportDetail(Long reportId) {
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
            contentTitle, contentBody,
            base.createdAt(), base.processedAt(), base.processedBy()
        );
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
