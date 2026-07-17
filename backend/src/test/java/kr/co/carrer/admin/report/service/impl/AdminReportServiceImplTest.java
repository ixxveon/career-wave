package kr.co.carrer.admin.report.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class AdminReportServiceImplTest {

    @InjectMocks
    private AdminReportServiceImpl adminReportService;

    @Mock private ReportRepository reportRepository;
    @Mock private ReportQueryRepository reportQueryRepository;
    @Mock private ReportBoardRepository reportBoardRepository;
    @Mock private ReportCommentRepository reportCommentRepository;
    @Mock private WebClient.Builder webClientBuilder;
    @Mock private ObjectMapper objectMapper;
    @Mock private WebClient webClient;
    @Mock private WebClient.RequestBodyUriSpec postSpec;
    @Mock private WebClient.RequestBodySpec bodySpec;
    @Mock private WebClient.ResponseSpec responseSpec;
    @SuppressWarnings("rawtypes") @Mock private Mono monoMock;

    @BeforeEach
    void setUp() {
        // self-injection: @Lazy @Autowired는 @InjectMocks로 주입되지 않으므로 직접 설정
        ReflectionTestUtils.setField(adminReportService, "self", adminReportService);
        // @PostConstruct init()은 테스트 환경에서 실행되지 않으므로 webClient와 webhookSecret을 직접 주입
        ReflectionTestUtils.setField(adminReportService, "webClient", webClient);
        ReflectionTestUtils.setField(adminReportService, "webhookSecret", "test-secret");
        // WebClient 체인 기본 스텁 (FastAPI를 호출하지 않는 테스트에서 불필요한 스텁 경고 방지)
        lenient().when(webClient.post()).thenReturn(postSpec);
        lenient().when(postSpec.uri(anyString())).thenReturn(bodySpec);
        lenient().when(bodySpec.header(anyString(), (String[]) any())).thenReturn(bodySpec);
        lenient().when(bodySpec.bodyValue(any())).thenAnswer(inv -> bodySpec);
        lenient().when(bodySpec.retrieve()).thenReturn(responseSpec);
        lenient().when(responseSpec.bodyToMono(Map.class)).thenReturn(monoMock);
        lenient().when(monoMock.timeout(any(java.time.Duration.class))).thenReturn(monoMock);
    }

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

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(1L, 1L);

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

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(2L, 1L);

            assertThat(result.contentTitle()).isNull();
            assertThat(result.contentBody()).isEqualTo("댓글 본문");
            verifyNoInteractions(reportBoardRepository);
        }

        @Test
        @DisplayName("MEMBER 신고 상세 조회 - contentTitle, contentBody 모두 null")
        void member_success() {
            ReportDetailDTO.ResponseDetail base = createBaseDetail(3L, TargetType.MEMBER, 30L);
            given(reportQueryRepository.findReportDetail(3L)).willReturn(Optional.of(base));

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(3L, 1L);

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

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(4L, 1L);

            assertThat(result.contentTitle()).isNull();
            assertThat(result.contentBody()).isNull();
        }

        @Test
        @DisplayName("존재하지 않는 신고 조회 시 REPORT_NOT_FOUND 예외")
        void notFound_throws() {
            given(reportQueryRepository.findReportDetail(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminReportService.getReportDetail(999L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.REPORT_NOT_FOUND);
        }

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("aiSuggestion null → FastAPI 호출 성공 → persistAiSuggestion 호출 및 결과 반환")
        void aiSuggestion_null_fastapi_success() throws Exception {
            ReportDetailDTO.ResponseDetail base = createBaseDetailWithNullAiSuggestion(5L, TargetType.BOARD, 50L);
            given(reportQueryRepository.findReportDetail(5L)).willReturn(Optional.of(base));
            given(reportBoardRepository.findTitleById(50L)).willReturn("게시글 제목");
            given(reportBoardRepository.findContentById(50L)).willReturn("게시글 본문");

            Map<String, Object> fakeResponse = Map.of("severity", "높음", "category", "SPAM", "suggestion", "조치 필요");
            given(monoMock.block()).willReturn(fakeResponse);
            given(objectMapper.writeValueAsString(any()))
                .willReturn("{\"severity\":\"높음\",\"category\":\"SPAM\",\"suggestion\":\"조치 필요\"}");

            Report report = createPendingReport(5L, TargetType.BOARD, 50L);
            given(reportRepository.findById(5L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(5L, 1L);

            assertThat(result.aiSuggestion()).isEqualTo("{\"severity\":\"높음\",\"category\":\"SPAM\",\"suggestion\":\"조치 필요\"}");
            verify(reportRepository).findById(5L);
        }

        @Test
        @DisplayName("aiSuggestion null → FastAPI 호출 실패 → aiSuggestion null로 나머지 상세 정상 반환")
        void aiSuggestion_null_fastapi_failure() {
            ReportDetailDTO.ResponseDetail base = createBaseDetailWithNullAiSuggestion(6L, TargetType.MEMBER, 60L);
            given(reportQueryRepository.findReportDetail(6L)).willReturn(Optional.of(base));
            given(monoMock.block()).willThrow(new RuntimeException("Connection refused"));

            ReportDetailDTO.ResponseDetail result = adminReportService.getReportDetail(6L, 1L);

            assertThat(result.aiSuggestion()).isNull();
            assertThat(result.reportId()).isEqualTo(6L);
            verify(reportRepository, never()).findById(any());
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

    // ── deleteContent ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("게시글·댓글 삭제(블라인드) - deleteContent()")
    class DeleteContent {

        @Test
        @DisplayName("BOARD 신고 콘텐츠 삭제 - boards.is_blind만 변경, report_status는 그대로")
        void board_success() {
            Report report = createPendingReport(1L, TargetType.BOARD, 10L);
            given(reportRepository.findById(1L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseContentDelete result = adminReportService.deleteContent(1L, 99L);

            assertThat(result.targetType()).isEqualTo(TargetType.BOARD);
            assertThat(result.targetId()).isEqualTo(10L);
            assertThat(report.getReportStatus()).isEqualTo(ReportStatus.PENDING);
            verify(reportBoardRepository).blind(10L);
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("COMMENT 신고 콘텐츠 삭제 - comments.is_blind만 변경")
        void comment_success() {
            Report report = createPendingReport(2L, TargetType.COMMENT, 20L);
            given(reportRepository.findById(2L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseContentDelete result = adminReportService.deleteContent(2L, 99L);

            assertThat(result.targetType()).isEqualTo(TargetType.COMMENT);
            verify(reportCommentRepository).blind(20L);
            verifyNoInteractions(reportBoardRepository);
        }

        @Test
        @DisplayName("이미 BLINDED/DISMISSED 처리된 신고여도 콘텐츠 삭제는 가능 — ALREADY_PROCESSED 가드 없음")
        void alreadyProcessedReport_stillDeletesContent() {
            Report report = createProcessedReport(3L, ReportStatus.DISMISSED);
            given(reportRepository.findById(3L)).willReturn(Optional.of(report));

            ReportDetailDTO.ResponseContentDelete result = adminReportService.deleteContent(3L, 99L);

            assertThat(result.reportId()).isEqualTo(3L);
            verify(reportBoardRepository).blind(1L);
        }

        @Test
        @DisplayName("MEMBER 신고는 삭제 대상이 아니므로 INVALID_TARGET_TYPE 예외")
        void memberTarget_throws() {
            Report report = createPendingReport(4L, TargetType.MEMBER, 30L);
            given(reportRepository.findById(4L)).willReturn(Optional.of(report));

            assertThatThrownBy(() -> adminReportService.deleteContent(4L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.INVALID_TARGET_TYPE);

            verifyNoInteractions(reportBoardRepository);
            verifyNoInteractions(reportCommentRepository);
        }

        @Test
        @DisplayName("존재하지 않는 신고 삭제 시 REPORT_NOT_FOUND 예외")
        void notFound_throws() {
            given(reportRepository.findById(999L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminReportService.deleteContent(999L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminReportErrorCode.REPORT_NOT_FOUND);
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
        // aiSuggestion을 non-null로 설정하여 테스트 내 FastAPI 호출 우회
        return new ReportDetailDTO.ResponseDetail(
            reportId, targetType, targetId,
            ReportReason.SPAM, ReportStatus.PENDING,
            "신고자", "피신고자",
            null, null, "{\"severity\":\"높음\",\"category\":\"SPAM\",\"suggestion\":\"테스트\"}",
            ZonedDateTime.now(), null, null,
            java.util.UUID.randomUUID()
        );
    }

    private ReportDetailDTO.ResponseDetail createBaseDetailWithNullAiSuggestion(Long reportId, TargetType targetType, Long targetId) {
        return new ReportDetailDTO.ResponseDetail(
            reportId, targetType, targetId,
            ReportReason.SPAM, ReportStatus.PENDING,
            "신고자", "피신고자",
            null, null, null,
            ZonedDateTime.now(), null, null,
            java.util.UUID.randomUUID()
        );
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
