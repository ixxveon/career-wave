package kr.co.carrer.admin.report.service;

import kr.co.carrer.admin.report.dto.ReportDetailDTO;
import kr.co.carrer.admin.report.type.ReportReason;
import kr.co.carrer.admin.report.type.ReportStatus;
import kr.co.carrer.admin.report.type.TargetType;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminReportService {

    ReportDetailDTO.ResponseSummary getSummary();

    PaginationResponse<ReportDetailDTO.ResponseList> getReports(ReportStatus status, TargetType targetType,
                                                                ReportReason reason, String keyword,
                                                                int page, int size);

    ReportDetailDTO.ResponseDetail getReportDetail(Long reportId, Long adminId);

    ReportDetailDTO.ResponseProcess blindReport(Long reportId, Long adminId);

    ReportDetailDTO.ResponseProcess dismissReport(Long reportId, Long adminId);
}
