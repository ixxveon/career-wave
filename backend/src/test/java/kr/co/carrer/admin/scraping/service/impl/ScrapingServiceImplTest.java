package kr.co.carrer.admin.scraping.service.impl;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.admin.scraping.exception.ScrapingErrorCode;
import kr.co.carrer.admin.scraping.service.ScrapingFastApiGateway;
import kr.co.carrer.admin.scraping.service.ScrapingService;
import kr.co.carrer.admin.scraping.type.ScrapingActionType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ScrapingServiceImplTest {

    @InjectMocks
    private ScrapingServiceImpl scrapingService;

    @Mock
    private ObjectProvider<ScrapingFastApiGateway> scrapingFastApiGatewayProvider;

    @Mock
    private ScrapingFastApiGateway scrapingFastApiGateway;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Nested
    @DisplayName("단일 액션 요청 - requestAction()")
    class RequestActionTest {

        @Test
        @DisplayName("RUN 액션 요청은 runPipeline으로 위임한다")
        void delegatesRunAction() {
            ZonedDateTime requestedAt = ZonedDateTime.parse("2026-06-21T12:00:00Z");
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.runPipeline(new ScrapingFastApiGateway.ActionRequest(
                    "wanted",
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.ActionResponse(
                    "wanted",
                    true,
                    "run-1",
                    requestedAt
            ));

            ScrapingService.ResponseAction result = scrapingService.requestAction(
                    "wanted",
                    new ScrapingService.RequestAction(ScrapingActionType.RUN, "manual run"),
                    1L,
                    "127.0.0.1"
            );

            ArgumentCaptor<ScrapingFastApiGateway.ActionRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.ActionRequest.class);
            verify(scrapingFastApiGateway).runPipeline(requestCaptor.capture());
            verify(scrapingFastApiGateway, never()).retryPipeline(org.mockito.ArgumentMatchers.any());
            verify(scrapingFastApiGateway, never()).testPipeline(org.mockito.ArgumentMatchers.any());

            assertThat(requestCaptor.getValue().sourceName()).isEqualTo("wanted");
            assertThat(requestCaptor.getValue().requestedBy()).isEqualTo("admin-service");
            assertThat(result.sourceName()).isEqualTo("wanted");
            assertThat(result.requestedAction()).isEqualTo(ScrapingActionType.RUN);
            assertThat(result.accepted()).isTrue();
            assertThat(result.runId()).isEqualTo("run-1");
            assertThat(result.requestedAt()).isEqualTo(requestedAt);
        }

        @Test
        @DisplayName("RETRY 액션 요청은 retryPipeline으로 위임한다")
        void delegatesRetryAction() {
            ZonedDateTime requestedAt = ZonedDateTime.parse("2026-06-21T12:10:00Z");
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.retryPipeline(new ScrapingFastApiGateway.ActionRequest(
                    "saramin",
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.ActionResponse(
                    "saramin",
                    true,
                    "retry-1",
                    requestedAt
            ));

            ScrapingService.ResponseAction result = scrapingService.requestAction(
                    "saramin",
                    new ScrapingService.RequestAction(ScrapingActionType.RETRY, "manual retry"),
                    1L,
                    "127.0.0.1"
            );

            ArgumentCaptor<ScrapingFastApiGateway.ActionRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.ActionRequest.class);
            verify(scrapingFastApiGateway).retryPipeline(requestCaptor.capture());
            verify(scrapingFastApiGateway, never()).runPipeline(org.mockito.ArgumentMatchers.any());
            verify(scrapingFastApiGateway, never()).testPipeline(org.mockito.ArgumentMatchers.any());

            assertThat(requestCaptor.getValue().sourceName()).isEqualTo("saramin");
            assertThat(requestCaptor.getValue().requestedBy()).isEqualTo("admin-service");
            assertThat(result.sourceName()).isEqualTo("saramin");
            assertThat(result.requestedAction()).isEqualTo(ScrapingActionType.RETRY);
            assertThat(result.accepted()).isTrue();
            assertThat(result.runId()).isEqualTo("retry-1");
            assertThat(result.requestedAt()).isEqualTo(requestedAt);
        }

        @Test
        @DisplayName("TEST 액션 요청은 testPipeline으로 위임한다")
        void delegatesTestAction() {
            ZonedDateTime requestedAt = ZonedDateTime.parse("2026-06-21T12:20:00Z");
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.testPipeline(new ScrapingFastApiGateway.ActionRequest(
                    "jobkorea",
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.ActionResponse(
                    "jobkorea",
                    true,
                    "test-1",
                    requestedAt
            ));

            ScrapingService.ResponseAction result = scrapingService.requestAction(
                    "jobkorea",
                    new ScrapingService.RequestAction(ScrapingActionType.TEST, "manual test"),
                    1L,
                    "127.0.0.1"
            );

            ArgumentCaptor<ScrapingFastApiGateway.ActionRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.ActionRequest.class);
            verify(scrapingFastApiGateway).testPipeline(requestCaptor.capture());
            verify(scrapingFastApiGateway, never()).runPipeline(org.mockito.ArgumentMatchers.any());
            verify(scrapingFastApiGateway, never()).retryPipeline(org.mockito.ArgumentMatchers.any());

            assertThat(requestCaptor.getValue().sourceName()).isEqualTo("jobkorea");
            assertThat(requestCaptor.getValue().requestedBy()).isEqualTo("admin-service");
            assertThat(result.sourceName()).isEqualTo("jobkorea");
            assertThat(result.requestedAction()).isEqualTo(ScrapingActionType.TEST);
            assertThat(result.accepted()).isTrue();
            assertThat(result.runId()).isEqualTo("test-1");
            assertThat(result.requestedAt()).isEqualTo(requestedAt);
        }

        @Test
        @DisplayName("이미 실행 중인 파이프라인이면 SCRAPING_ALREADY_RUNNING 예외를 유지한다")
        void preservesAlreadyRunningError() {
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.runPipeline(new ScrapingFastApiGateway.ActionRequest(
                    "wanted",
                    "admin-service"
            ))).willThrow(new CustomException(ScrapingErrorCode.SCRAPING_ALREADY_RUNNING));

            assertThatThrownBy(() -> scrapingService.requestAction(
                    "wanted",
                    new ScrapingService.RequestAction(ScrapingActionType.RUN, "duplicate run"),
                    1L,
                    "127.0.0.1"
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ScrapingErrorCode.SCRAPING_ALREADY_RUNNING);
        }

        @Test
        @DisplayName("액션 요청 성공 시 SCRAPING_SYSTEM 감사 로그를 기록한다")
        void savesAuditLogAfterActionRequest() {
            ZonedDateTime requestedAt = ZonedDateTime.parse("2026-06-21T12:30:00Z");
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.runPipeline(new ScrapingFastApiGateway.ActionRequest(
                    "wanted",
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.ActionResponse(
                    "wanted",
                    true,
                    "run-2",
                    requestedAt
            ));

            scrapingService.requestAction(
                    "wanted",
                    new ScrapingService.RequestAction(ScrapingActionType.RUN, "manual run"),
                    7L,
                    "10.0.0.1"
            );

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(7L);
            assertThat(auditLog.getLogType()).isEqualTo(AuditLogType.SCRAPING_SYSTEM);
            assertThat(auditLog.getAction()).isEqualTo("RUN");
            assertThat(auditLog.getTargetType()).isEqualTo("SCRAPING_PIPELINE");
            assertThat(auditLog.getTargetId()).isEqualTo("wanted");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.1");
            assertThat(auditLog.getSeverity()).isEqualTo(AuditLogSeverity.INFO);
            assertThat(auditLog.getDetail()).isEqualTo("reason=manual run");
        }
    }

    @Nested
    @DisplayName("배치 액션 요청 - requestBatchAction()")
    class RequestBatchActionTest {

        @Test
        @DisplayName("배치 액션 요청은 batchRunPipelines로 위임하고 결과를 매핑한다")
        void delegatesBatchAction() {
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.batchRunPipelines(new ScrapingFastApiGateway.BatchActionRequest(
                    ScrapingActionType.RUN,
                    List.of("wanted", "saramin"),
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.BatchActionResponse(
                    "RUN",
                    2,
                    1,
                    ZonedDateTime.parse("2026-06-21T13:00:00Z"),
                    List.of(
                            new ScrapingFastApiGateway.BatchActionItemResponse("wanted", true, "accepted"),
                            new ScrapingFastApiGateway.BatchActionItemResponse("saramin", false, "already running")
                    )
            ));

            ScrapingService.ResponseBatchAction result = scrapingService.requestBatchAction(
                    new ScrapingService.RequestBatchAction(
                            ScrapingActionType.RUN,
                            "manual batch run",
                            List.of("wanted", "saramin")
                    ),
                    1L,
                    "127.0.0.1"
            );

            ArgumentCaptor<ScrapingFastApiGateway.BatchActionRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.BatchActionRequest.class);
            verify(scrapingFastApiGateway).batchRunPipelines(requestCaptor.capture());

            assertThat(requestCaptor.getValue().actionType()).isEqualTo(ScrapingActionType.RUN);
            assertThat(requestCaptor.getValue().sourceNames()).containsExactly("wanted", "saramin");
            assertThat(requestCaptor.getValue().requestedBy()).isEqualTo("admin-service");

            assertThat(result.requestedCount()).isEqualTo(2);
            assertThat(result.acceptedCount()).isEqualTo(1);
            assertThat(result.failedCount()).isEqualTo(1);
            assertThat(result.results()).hasSize(2);
            assertThat(result.results().get(0).sourceName()).isEqualTo("wanted");
            assertThat(result.results().get(0).accepted()).isTrue();
            assertThat(result.results().get(0).message()).isEqualTo("accepted");
            assertThat(result.results().get(1).sourceName()).isEqualTo("saramin");
            assertThat(result.results().get(1).accepted()).isFalse();
            assertThat(result.results().get(1).message()).isEqualTo("already running");
        }

        @Test
        @DisplayName("배치 액션 요청 성공 시 SCRAPING_SYSTEM 감사 로그를 기록한다")
        void savesAuditLogAfterBatchActionRequest() {
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.batchRunPipelines(new ScrapingFastApiGateway.BatchActionRequest(
                    ScrapingActionType.RETRY,
                    List.of("wanted", "saramin"),
                    "admin-service"
            ))).willReturn(new ScrapingFastApiGateway.BatchActionResponse(
                    "RETRY",
                    2,
                    2,
                    ZonedDateTime.parse("2026-06-21T13:10:00Z"),
                    List.of(
                            new ScrapingFastApiGateway.BatchActionItemResponse("wanted", true, "accepted"),
                            new ScrapingFastApiGateway.BatchActionItemResponse("saramin", true, "accepted")
                    )
            ));

            scrapingService.requestBatchAction(
                    new ScrapingService.RequestBatchAction(
                            ScrapingActionType.RETRY,
                            "manual batch retry",
                            List.of("wanted", "saramin")
                    ),
                    9L,
                    "10.0.0.2"
            );

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());

            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(9L);
            assertThat(auditLog.getLogType()).isEqualTo(AuditLogType.SCRAPING_SYSTEM);
            assertThat(auditLog.getAction()).isEqualTo("BATCH_RETRY");
            assertThat(auditLog.getTargetType()).isEqualTo("SCRAPING_BATCH");
            assertThat(auditLog.getTargetId()).isEqualTo("wanted,saramin");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.2");
            assertThat(auditLog.getSeverity()).isEqualTo(AuditLogSeverity.INFO);
            assertThat(auditLog.getDetail()).isEqualTo("reason=manual batch retry");
        }
    }

    @Nested
    @DisplayName("페이지 변환 - page 계약")
    class PageConversionTest {

        @Test
        @DisplayName("목록 조회는 외부 1-based page를 그대로 gateway 요청에 전달한다")
        void passesOneBasedPageToPipelineSearch() {
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.getPipelines(new ScrapingFastApiGateway.PipelineSearchRequest(
                    "wanted",
                    null,
                    2,
                    20
            ))).willReturn(new ScrapingFastApiGateway.PipelinePageResponse(
                    List.of(),
                    2,
                    20,
                    0L,
                    0
            ));

            ScrapingService.ResponsePipelinePage result = scrapingService.getPipelines("wanted", null, 2, 20);

            ArgumentCaptor<ScrapingFastApiGateway.PipelineSearchRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.PipelineSearchRequest.class);
            verify(scrapingFastApiGateway).getPipelines(requestCaptor.capture());
            assertThat(requestCaptor.getValue().page()).isEqualTo(2);
            assertThat(requestCaptor.getValue().size()).isEqualTo(20);
            assertThat(result.page()).isEqualTo(2);
            assertThat(result.size()).isEqualTo(20);
        }

        @Test
        @DisplayName("로그 조회는 외부 1-based page를 그대로 gateway 요청에 전달한다")
        void passesOneBasedPageToLogSearch() {
            given(scrapingFastApiGatewayProvider.getIfAvailable()).willReturn(scrapingFastApiGateway);
            given(scrapingFastApiGateway.getLogs(new ScrapingFastApiGateway.LogSearchRequest(
                    "wanted",
                    null,
                    3,
                    10
            ))).willReturn(new ScrapingFastApiGateway.LogPageResponse(
                    List.of(),
                    3,
                    10,
                    0L,
                    0
            ));

            ScrapingService.ResponseLogPage result = scrapingService.getLogs("wanted", null, 3, 10);

            ArgumentCaptor<ScrapingFastApiGateway.LogSearchRequest> requestCaptor =
                    ArgumentCaptor.forClass(ScrapingFastApiGateway.LogSearchRequest.class);
            verify(scrapingFastApiGateway).getLogs(requestCaptor.capture());
            assertThat(requestCaptor.getValue().page()).isEqualTo(3);
            assertThat(requestCaptor.getValue().size()).isEqualTo(10);
            assertThat(result.page()).isEqualTo(3);
            assertThat(result.size()).isEqualTo(10);
        }

        @Test
        @DisplayName("page가 1보다 작으면 BAD_REQUEST 예외가 발생한다")
        void throwsBadRequestWhenPageIsLessThanOne() {
            assertThatThrownBy(() -> scrapingService.getPipelines(null, null, 0, 20))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }
    }
}
