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
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminReportServiceImplTest {

    @InjectMocks
    private AdminReportServiceImpl adminReportService;

    @Mock private ReportRepository reportRepository;
    @Mock private ReportQueryRepository reportQueryRepository;
    @Mock private ReportBoardRepository reportBoardRepository;
    @Mock private ReportCommentRepository reportCommentRepository;

    // ── getSummary ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("KPI 집계 조회 - getSummary()")
    class GetSummary {

        @Test
        @DisplayName("전체·대기·블라인드·고위험 건수 집계 성공")
        void getSummary_success() {
            given(reportRepository.count()).willReturn(10L);
            given(reportRepository.countByReportStatus(ReportStatus.PENDING)).willReturn(5L);
            given(reportRepository.countByReportStatus(ReportStatus.BLINDED)).willReturn(3L);
            given(reportRepository.countHighRisk()).willReturn(2L);

            ReportDetailDTO.ResponseSummary result = adminReportService.getSummary();

            assertThat(result.totalCount()).isEqualTo(10L);
            assertThat(result.pendingCount()).isEqualTo(5L);
            assertThat(result.blindedCount()).isEqualTo(3L);
            assertThat(result.highRiskCount()).isEqualTo(2L);
        }
    }

    // ── getReportDetail ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("신고 상세 조회 - getReportDetail()")
    class GetReportDetail {

        @Test
        @DisplayName("BOARD 신고 상세 조회 - contentTitle과 contentBody 채움")
        void board_success() {
            ReportDetailDTO.ResponseDetail base = createBaseDetail(1L, TargetType.BOARD, 10L);
            given(reportQueryRepository.findReportDetail(1L)).willReturn(Optional.of(base));
            given(reportBoardRepository.findTitleById(10L)).willReturn("게시글 제목");
            given(reportBoardRepository.findContentById(10L)).willReturn("게시글 본문");

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(1L);

            assertThat(result.contentTitle()).isEqualTo("게시글 제목");
            assertThat(result.contentBody()).isEqualTo("게시글 본문");
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("COMMENT 신고 상세 조회 - contentBody만 채움, contentTitle null")
        void comment_success() {
            ReportDetailDTO.ResponseDetail base = createBaseDetail(2L, TargetType.COMMENT, 20L);
            given(reportQueryRepository.findReportDetail(2L)).willReturn(Optional.of(base));
            given(reportCommentRepository.findContentById(20L)).willReturn("댓글 본문");

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(2L);

            assertThat(result.contentTitle()).isNull();
            assertThat(result.contentBody()).isEqualTo("댓글 본문");
            verifyNoInteractions(reportBoardRepository);
        }

        @Test
        @DisplayName("MEMBER 신고 상세 조회 - contentTitle, contentBody 모두 null")
        void member_success() {
            ReportDetailDTO.ResponseDetail base = createBaseDetail(3L, TargetType.MEMBER, 30L);
            given(reportQueryRepository.findReportDetail(3L)).willReturn(Optional.of(base));

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(3L);

            assertThat(result.contentTitle()).isNull();
            assertThat(result.contentBody()).isNull();
            verifyNoInteractions(reportBoardRepository);
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("BOARD 신고 대상 게시글 삭제 시 contentTitle, contentBody null 반환")
        void board_deleted_returnsNull() {
            ReportDetailDTO.ResponseDetail base = createBaseDetail(4L, TargetType.BOARD, 40L);
            given(reportQueryRepository.findReportDetail(4L)).willReturn(Optional.of(base));
            given(reportBoardRepository.findTitleById(40L)).willReturn(null);
            given(reportBoardRepository.findContentById(40L)).willReturn(null);

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(4L);

            assertThat(result.contentTitle()).isNull();
            assertThat(result.contentBody()).isNull();
        }

        @Test
        @DisplayName("존재하지 않는 신고 조회 시 REPORT_NOT_FOUND 예외")
        void notFound_throws() {
            given(reportQueryRepository.findReportDetail(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminReportService.getReportDetail(999L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.REPORT_NOT_FOUND);
        }
    }

    // ── blindReport ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("블라인드 처리 - blindReport()")
    class BlindReport {

        @Test
        @DisplayName("BOARD 신고 블라인드 처리 - boards.is_blind도 함께 변경")
        void blind_board_success() {
            Report report = createPendingReport(1L, TargetType.BOARD, 10L);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseProcess result = adminReportService.blindReport(1L, 99L);

            assertThat(result.reportStatus()).isEqualTo(ReportStatus.BLINDED);
            verify(reportBoardRepository).blind(10L);
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("COMMENT 신고 블라인드 처리 - comments.is_blind도 함께 변경")
        void blind_comment_success() {
            Report report = createPendingReport(2L, TargetType.COMMENT, 20L);
            given(reportRepository.findById(2L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseProcess result = adminReportService.blindReport(2L, 99L);

            assertThat(result.reportStatus()).isEqualTo(ReportStatus.BLINDED);
            verify(reportCommentRepository).blind(20L);
            verifyNoInteractions(reportBoardRepository);
        }

        @Test
        @DisplayName("MEMBER 신고 블라인드 처리 - 콘텐츠 테이블 변경 없음")
        void blind_member_success() {
            Report report = createPendingReport(3L, TargetType.MEMBER, 30L);
            given(reportRepository.findById(3L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseProcess result = adminReportService.blindReport(3L, 99L);

            assertThat(result.reportStatus()).isEqualTo(ReportStatus.BLINDED);
            verifyNoInteractions(reportBoardRepository);
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("존재하지 않는 신고 블라인드 처리 시 REPORT_NOT_FOUND 예외")
        void notFound_throws() {
            given(reportRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminReportService.blindReport(999L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.REPORT_NOT_FOUND);
        }

        @Test
        @DisplayName("이미 BLINDED 신고 재처리 시 ALREADY_PROCESSED 예외")
        void alreadyBlinded_throws() {
            Report report = createProcessedReport(1L, ReportStatus.BLINDED);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            assertThatThrownBy(() -> adminReportService.blindReport(1L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.ALREADY_PROCESSED);
        }

        @Test
        @DisplayName("이미 DISMISSED 신고 블라인드 처리 시 ALREADY_PROCESSED 예외")
        void alreadyDismissed_throws() {
            Report report = createProcessedReport(1L, ReportStatus.DISMISSED);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            assertThatThrownBy(() -> adminReportService.blindReport(1L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.ALREADY_PROCESSED);
        }
    }

    // ── dismissReport ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("기각 처리 - dismissReport()")
    class DismissReport {

        @Test
        @DisplayName("PENDING 신고 기각 처리 성공")
        void dismiss_success() {
            Report report = createPendingReport(1L, TargetType.BOARD, 10L);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseProcess result = adminReportService.dismissReport(1L, 99L);

            assertThat(result.reportStatus()).isEqualTo(ReportStatus.DISMISSED);
            assertThat(result.processedAt()).isNotNull();
        }

        @Test
        @DisplayName("존재하지 않는 신고 기각 처리 시 REPORT_NOT_FOUND 예외")
        void notFound_throws() {
            given(reportRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminReportService.dismissReport(999L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.REPORT_NOT_FOUND);
        }

        @Test
        @DisplayName("이미 처리된 신고 기각 시 ALREADY_PROCESSED 예외")
        void alreadyProcessed_throws() {
            Report report = createProcessedReport(1L, ReportStatus.BLINDED);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            assertThatThrownBy(() -> adminReportService.dismissReport(1L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.ALREADY_PROCESSED);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Report createPendingReport(Long reportId, TargetType targetType, Long targetId) {
        try {
            var constructor = Report.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Report report = constructor.newInstance();
            setField(report, "reportId", reportId);
            setField(report, "targetType", targetType);
            setField(report, "targetId", targetId);
            setField(report, "reportStatus", ReportStatus.PENDING);
            return report;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Report createProcessedReport(Long reportId, ReportStatus status) {
        try {
            var constructor = Report.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Report report = constructor.newInstance();
            setField(report, "reportId", reportId);
            setField(report, "targetType", TargetType.BOARD);
            setField(report, "targetId", 1L);
            setField(report, "reportStatus", status);
            return report;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private ReportDetailDTO.ResponseDetail createBaseDetail(Long reportId, TargetType targetType, Long targetId) {
        return new ReportDetailDTO.ResponseDetail(
            reportId, targetType, targetId,
            ReportReason.SPAM, ReportStatus.PENDING,
            "신고자", "피신고자",
            null, null,
            ZonedDateTime.now(), null, null
        );
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
