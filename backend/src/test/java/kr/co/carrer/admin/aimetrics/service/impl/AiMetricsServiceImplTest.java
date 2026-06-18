package kr.co.carrer.admin.aimetrics.service.impl;

import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.aimetrics.entity.AiOpsSetting;
import kr.co.carrer.admin.aimetrics.entity.RagDocument;
import kr.co.carrer.admin.aimetrics.repository.AiModelRepository;
import kr.co.carrer.admin.aimetrics.repository.AiOpsSettingRepository;
import kr.co.carrer.admin.aimetrics.repository.RagDocumentRepository;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import kr.co.carrer.admin.aimetrics.service.AiMetricsService;
import kr.co.carrer.admin.aimetrics.exception.AiMetricsErrorCode;
import kr.co.carrer.admin.aimetrics.type.AiFeatureType;
import kr.co.carrer.admin.aimetrics.type.AlertChannelType;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AiMetricsServiceImplTest {

    @InjectMocks
    private AiMetricsServiceImpl aiMetricsService;

    @Mock
    private ObjectProvider<AiMetricsFastApiGateway> aiMetricsFastApiGatewayProvider;

    @Mock
    private AiMetricsFastApiGateway aiMetricsFastApiGateway;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private AiModelRepository aiModelRepository;

    @Mock
    private AiOpsSettingRepository aiOpsSettingRepository;

    @Mock
    private RagDocumentRepository ragDocumentRepository;

    @Nested
    @DisplayName("AI 사용량 요약 조회 - getSummary()")
    class GetSummary {

        @Test
        @DisplayName("FastAPI 요약 응답을 Spring 서비스 응답으로 변환한다")
        void returnsSummaryFromFastApiAggregation() {
            String from = "2026-06-01T00:00:00Z";
            String to = "2026-06-17T23:59:59Z";
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getSummary(new AiMetricsFastApiGateway.SummaryRequest(
                    from,
                    to,
                    AiFeatureType.DOCUMENT
            ))).willReturn(new AiMetricsFastApiGateway.SummaryResponse(
                    120L,
                    45_000L,
                    18_000L,
                    new BigDecimal("12.75"),
                    80L,
                    40L,
                    3L,
                    "gpt-4o-mini"
            ));

            AiMetricsService.ResponseSummary result = aiMetricsService.getSummary(from, to, AiFeatureType.DOCUMENT);

            assertThat(result.totalRequests()).isEqualTo(120L);
            assertThat(result.totalInputTokens()).isEqualTo(45_000L);
            assertThat(result.totalOutputTokens()).isEqualTo(18_000L);
            assertThat(result.totalCost()).isEqualByComparingTo("12.75");
            assertThat(result.documentRequests()).isEqualTo(80L);
            assertThat(result.interviewRequests()).isEqualTo(40L);
            assertThat(result.activeModelId()).isEqualTo(3L);
            assertThat(result.activeModelName()).isEqualTo("gpt-4o-mini");

            ArgumentCaptor<AiMetricsFastApiGateway.SummaryRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.SummaryRequest.class);
            verify(aiMetricsFastApiGateway).getSummary(requestCaptor.capture());
            AiMetricsFastApiGateway.SummaryRequest request = requestCaptor.getValue();
            assertThat(request.from()).isEqualTo(from);
            assertThat(request.to()).isEqualTo(to);
            assertThat(request.featureType()).isEqualTo(AiFeatureType.DOCUMENT);
        }
    }

    @Nested
    @DisplayName("도메인별 AI 사용량 조회 - getDomainUsage()")
    class GetDomainUsage {

        @Test
        @DisplayName("FastAPI 도메인별 사용량 응답을 Spring 서비스 응답으로 변환한다")
        void returnsDomainUsageFromFastApiAggregation() {
            String from = "2026-06-01T00:00:00Z";
            String to = "2026-06-17T23:59:59Z";
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getDomainUsage(new AiMetricsFastApiGateway.PeriodRequest(
                    from,
                    to
            ))).willReturn(new AiMetricsFastApiGateway.DomainUsageResponse(
                    new AiMetricsFastApiGateway.FeatureUsageResponse(
                            70L,
                            30_000L,
                            12_000L,
                            new BigDecimal("8.40")
                    ),
                    new AiMetricsFastApiGateway.FeatureUsageResponse(
                            50L,
                            15_000L,
                            6_000L,
                            new BigDecimal("4.35")
                    )
            ));

            AiMetricsService.ResponseDomainUsage result = aiMetricsService.getDomainUsage(from, to);

            assertThat(result.document().requestCount()).isEqualTo(70L);
            assertThat(result.document().inputTokens()).isEqualTo(30_000L);
            assertThat(result.document().outputTokens()).isEqualTo(12_000L);
            assertThat(result.document().cost()).isEqualByComparingTo("8.40");
            assertThat(result.interview().requestCount()).isEqualTo(50L);
            assertThat(result.interview().inputTokens()).isEqualTo(15_000L);
            assertThat(result.interview().outputTokens()).isEqualTo(6_000L);
            assertThat(result.interview().cost()).isEqualByComparingTo("4.35");

            ArgumentCaptor<AiMetricsFastApiGateway.PeriodRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.PeriodRequest.class);
            verify(aiMetricsFastApiGateway).getDomainUsage(requestCaptor.capture());
            AiMetricsFastApiGateway.PeriodRequest request = requestCaptor.getValue();
            assertThat(request.from()).isEqualTo(from);
            assertThat(request.to()).isEqualTo(to);
        }
    }

    @Nested
    @DisplayName("토큰 사용 추이 조회 - getTokenTrend()")
    class GetTokenTrend {

        @Test
        @DisplayName("FastAPI 토큰 추이 응답을 Spring 서비스 응답으로 변환한다")
        void returnsTokenTrendFromFastApiAggregation() {
            String from = "2026-06-01T00:00:00Z";
            String to = "2026-06-17T23:59:59Z";
            String interval = "DAILY";
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getTokenTrend(new AiMetricsFastApiGateway.TokenTrendRequest(
                    from,
                    to,
                    AiFeatureType.INTERVIEW,
                    interval
            ))).willReturn(new AiMetricsFastApiGateway.TokenTrendResponse(
                    interval,
                    List.of(
                            new AiMetricsFastApiGateway.TokenTrendPointResponse(
                                    "2026-06-16",
                                    10_000L,
                                    4_000L,
                                    new BigDecimal("2.10")
                            ),
                            new AiMetricsFastApiGateway.TokenTrendPointResponse(
                                    "2026-06-17",
                                    12_000L,
                                    5_000L,
                                    new BigDecimal("2.55")
                            )
                    )
            ));

            AiMetricsService.ResponseTokenTrend result = aiMetricsService.getTokenTrend(
                    from,
                    to,
                    AiFeatureType.INTERVIEW,
                    interval
            );

            assertThat(result.interval()).isEqualTo(interval);
            assertThat(result.points()).hasSize(2);
            assertThat(result.points().get(0).bucket()).isEqualTo("2026-06-16");
            assertThat(result.points().get(0).inputTokens()).isEqualTo(10_000L);
            assertThat(result.points().get(0).outputTokens()).isEqualTo(4_000L);
            assertThat(result.points().get(0).cost()).isEqualByComparingTo("2.10");
            assertThat(result.points().get(1).bucket()).isEqualTo("2026-06-17");
            assertThat(result.points().get(1).inputTokens()).isEqualTo(12_000L);
            assertThat(result.points().get(1).outputTokens()).isEqualTo(5_000L);
            assertThat(result.points().get(1).cost()).isEqualByComparingTo("2.55");

            ArgumentCaptor<AiMetricsFastApiGateway.TokenTrendRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.TokenTrendRequest.class);
            verify(aiMetricsFastApiGateway).getTokenTrend(requestCaptor.capture());
            AiMetricsFastApiGateway.TokenTrendRequest request = requestCaptor.getValue();
            assertThat(request.from()).isEqualTo(from);
            assertThat(request.to()).isEqualTo(to);
            assertThat(request.featureType()).isEqualTo(AiFeatureType.INTERVIEW);
            assertThat(request.interval()).isEqualTo(interval);
        }
    }

    @Nested
    @DisplayName("고사용 사용자 조회 - getHeavyUsers()")
    class GetHeavyUsers {

        @Test
        @DisplayName("FastAPI 고사용 사용자 응답을 Spring 서비스 응답으로 변환한다")
        void returnsHeavyUsersFromFastApiAggregation() {
            String from = "2026-06-01T00:00:00Z";
            String to = "2026-06-17T23:59:59Z";
            int limit = 2;
            UUID firstMemberId = UUID.fromString("11111111-1111-1111-1111-111111111111");
            UUID secondMemberId = UUID.fromString("22222222-2222-2222-2222-222222222222");
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getHeavyUsers(new AiMetricsFastApiGateway.HeavyUsersRequest(
                    from,
                    to,
                    AiFeatureType.DOCUMENT,
                    limit
            ))).willReturn(new AiMetricsFastApiGateway.HeavyUsersResponse(
                    List.of(
                            new AiMetricsFastApiGateway.HeavyUserResponse(
                                    firstMemberId,
                                    35L,
                                    20_000L,
                                    8_000L,
                                    new BigDecimal("5.20")
                            ),
                            new AiMetricsFastApiGateway.HeavyUserResponse(
                                    secondMemberId,
                                    28L,
                                    14_000L,
                                    6_000L,
                                    new BigDecimal("3.80")
                            )
                    )
            ));

            AiMetricsService.ResponseHeavyUsers result = aiMetricsService.getHeavyUsers(
                    from,
                    to,
                    AiFeatureType.DOCUMENT,
                    limit
            );

            assertThat(result.users()).hasSize(2);
            assertThat(result.users().get(0).memberId()).isEqualTo(firstMemberId);
            assertThat(result.users().get(0).requestCount()).isEqualTo(35L);
            assertThat(result.users().get(0).inputTokens()).isEqualTo(20_000L);
            assertThat(result.users().get(0).outputTokens()).isEqualTo(8_000L);
            assertThat(result.users().get(0).cost()).isEqualByComparingTo("5.20");
            assertThat(result.users().get(1).memberId()).isEqualTo(secondMemberId);
            assertThat(result.users().get(1).requestCount()).isEqualTo(28L);
            assertThat(result.users().get(1).inputTokens()).isEqualTo(14_000L);
            assertThat(result.users().get(1).outputTokens()).isEqualTo(6_000L);
            assertThat(result.users().get(1).cost()).isEqualByComparingTo("3.80");

            ArgumentCaptor<AiMetricsFastApiGateway.HeavyUsersRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.HeavyUsersRequest.class);
            verify(aiMetricsFastApiGateway).getHeavyUsers(requestCaptor.capture());
            AiMetricsFastApiGateway.HeavyUsersRequest request = requestCaptor.getValue();
            assertThat(request.from()).isEqualTo(from);
            assertThat(request.to()).isEqualTo(to);
            assertThat(request.featureType()).isEqualTo(AiFeatureType.DOCUMENT);
            assertThat(request.limit()).isEqualTo(limit);
        }
    }

    @Nested
    @DisplayName("AI 사용 로그 목록 조회 - getUsageLogs()")
    class GetUsageLogs {

        @Test
        @DisplayName("FastAPI 사용 로그 페이지 응답을 Spring 서비스 응답으로 변환한다")
        void returnsUsageLogsFromFastApiSearch() {
            int page = 2;
            int size = 10;
            UUID memberId = UUID.fromString("33333333-3333-3333-3333-333333333333");
            UUID sessionId = UUID.fromString("44444444-4444-4444-4444-444444444444");
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-17T10:30:00Z");
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getUsageLogs(new AiMetricsFastApiGateway.UsageLogSearchRequest(
                    AiFeatureType.INTERVIEW,
                    page,
                    size
            ))).willReturn(new AiMetricsFastApiGateway.UsageLogListResponse(
                    List.of(new AiMetricsFastApiGateway.UsageLogItemResponse(
                            15L,
                            memberId,
                            sessionId,
                            3L,
                            AiFeatureType.INTERVIEW,
                            1_500L,
                            700L,
                            new BigDecimal("0.42"),
                            createdAt
                    )),
                    page,
                    size,
                    21L,
                    3
            ));

            AiMetricsService.ResponseUsageLogList result = aiMetricsService.getUsageLogs(
                    AiFeatureType.INTERVIEW,
                    page,
                    size
            );

            assertThat(result.page()).isEqualTo(page);
            assertThat(result.size()).isEqualTo(size);
            assertThat(result.totalElements()).isEqualTo(21L);
            assertThat(result.totalPages()).isEqualTo(3);
            assertThat(result.content()).hasSize(1);
            AiMetricsService.ResponseUsageLogItem item = result.content().getFirst();
            assertThat(item.aiUsageLogId()).isEqualTo(15L);
            assertThat(item.memberId()).isEqualTo(memberId);
            assertThat(item.sessionId()).isEqualTo(sessionId);
            assertThat(item.aiModelId()).isEqualTo(3L);
            assertThat(item.featureType()).isEqualTo(AiFeatureType.INTERVIEW);
            assertThat(item.inputTokens()).isEqualTo(1_500L);
            assertThat(item.outputTokens()).isEqualTo(700L);
            assertThat(item.cost()).isEqualByComparingTo("0.42");
            assertThat(item.createdAt()).isEqualTo(createdAt);

            ArgumentCaptor<AiMetricsFastApiGateway.UsageLogSearchRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.UsageLogSearchRequest.class);
            verify(aiMetricsFastApiGateway).getUsageLogs(requestCaptor.capture());
            AiMetricsFastApiGateway.UsageLogSearchRequest request = requestCaptor.getValue();
            assertThat(request.featureType()).isEqualTo(AiFeatureType.INTERVIEW);
            assertThat(request.page()).isEqualTo(page);
            assertThat(request.size()).isEqualTo(size);
        }
    }

    @Nested
    @DisplayName("AI 운영 설정 조회 - getBudget()")
    class GetBudget {

        @Test
        @DisplayName("singleton 운영 설정을 Spring 서비스 응답으로 변환한다")
        void returnsBudgetFromSingletonSetting() {
            ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-17T12:00:00Z");
            AiOpsSetting setting = createAiOpsSetting();
            ReflectionTestUtils.setField(setting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(setting, "selectedModelId", 3L);
            ReflectionTestUtils.setField(setting, "monthlyBudget", new BigDecimal("1000000.00"));
            ReflectionTestUtils.setField(setting, "alertEnabled", true);
            ReflectionTestUtils.setField(setting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(setting, "alertThreshold", 80);
            ReflectionTestUtils.setField(setting, "rateLimitEnabled", true);
            ReflectionTestUtils.setField(setting, "updatedAt", updatedAt);
            given(aiOpsSettingRepository.findSingleton()).willReturn(Optional.of(setting));

            AiMetricsService.ResponseBudget result = aiMetricsService.getBudget();

            assertThat(result.aiOpsSettingId()).isEqualTo(1L);
            assertThat(result.selectedModelId()).isEqualTo(3L);
            assertThat(result.monthlyBudget()).isEqualByComparingTo("1000000.00");
            assertThat(result.alertEnabled()).isTrue();
            assertThat(result.alertChannel()).isEqualTo(AlertChannelType.DISCORD);
            assertThat(result.alertThreshold()).isEqualTo(80);
            assertThat(result.rateLimitEnabled()).isTrue();
            assertThat(result.updatedAt()).isEqualTo(updatedAt);
            verify(aiOpsSettingRepository).findSingleton();
        }
    }

    @Nested
    @DisplayName("예산 및 임계치 수정 - updateBudget()")
    class UpdateBudget {

        @Test
        @DisplayName("운영 설정을 수정하고 FastAPI 동기화와 Audit Log 기록을 수행한다")
        void updatesBudgetAndSynchronizesOpsSetting() {
            AiOpsSetting setting = createAiOpsSetting();
            ReflectionTestUtils.setField(setting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(setting, "selectedModelId", 3L);
            ReflectionTestUtils.setField(setting, "monthlyBudget", new BigDecimal("500000.00"));
            ReflectionTestUtils.setField(setting, "alertEnabled", true);
            ReflectionTestUtils.setField(setting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(setting, "alertThreshold", 70);
            ReflectionTestUtils.setField(setting, "rateLimitEnabled", false);
            ReflectionTestUtils.setField(setting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            given(aiModelRepository.existsById(4L)).willReturn(true);
            given(aiOpsSettingRepository.findSingleton()).willReturn(Optional.of(setting));
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    4L,
                    new BigDecimal("1200000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    85,
                    false
            ))).willReturn(new AiMetricsFastApiGateway.OpsSettingSyncResponse(true));

            AiMetricsService.ResponseBudget result = aiMetricsService.updateBudget(
                    new AiMetricsService.RequestUpdateBudget(
                            4L,
                            new BigDecimal("1200000.00"),
                            85
                    ),
                    10L,
                    "127.0.0.1"
            );

            assertThat(result.selectedModelId()).isEqualTo(4L);
            assertThat(result.monthlyBudget()).isEqualByComparingTo("1200000.00");
            assertThat(result.alertThreshold()).isEqualTo(85);
            assertThat(result.alertEnabled()).isTrue();
            assertThat(result.alertChannel()).isEqualTo(AlertChannelType.DISCORD);
            assertThat(result.rateLimitEnabled()).isFalse();
            verify(aiModelRepository).existsById(4L);
            verify(aiMetricsFastApiGateway).syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    4L,
                    new BigDecimal("1200000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    85,
                    false
            ));

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());
            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(10L);
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_AI_BUDGET");
            assertThat(auditLog.getTargetType()).isEqualTo("AI_OPS_SETTING");
            assertThat(auditLog.getTargetId()).isEqualTo("1");
            assertThat(auditLog.getIpAddress()).isEqualTo("127.0.0.1");
        }
    }

    @Nested
    @DisplayName("Discord 알림 설정 변경 - updateDiscordAlert()")
    class UpdateDiscordAlert {

        @Test
        @DisplayName("알림 활성 여부만 변경하고 채널은 DISCORD로 고정한다")
        void updatesDiscordAlertOnly() {
            AiOpsSetting setting = createAiOpsSetting();
            ReflectionTestUtils.setField(setting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(setting, "selectedModelId", 3L);
            ReflectionTestUtils.setField(setting, "monthlyBudget", new BigDecimal("500000.00"));
            ReflectionTestUtils.setField(setting, "alertEnabled", false);
            ReflectionTestUtils.setField(setting, "alertChannel", AlertChannelType.SLACK);
            ReflectionTestUtils.setField(setting, "alertThreshold", 70);
            ReflectionTestUtils.setField(setting, "rateLimitEnabled", true);
            ReflectionTestUtils.setField(setting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            given(aiOpsSettingRepository.findSingleton()).willReturn(Optional.of(setting));
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    3L,
                    new BigDecimal("500000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    70,
                    true
            ))).willReturn(new AiMetricsFastApiGateway.OpsSettingSyncResponse(true));

            AiMetricsService.ResponseBudget result = aiMetricsService.updateDiscordAlert(
                    new AiMetricsService.RequestUpdateDiscordAlert(true),
                    11L,
                    "10.0.0.5"
            );

            assertThat(result.alertEnabled()).isTrue();
            assertThat(result.alertChannel()).isEqualTo(AlertChannelType.DISCORD);
            assertThat(result.selectedModelId()).isEqualTo(3L);
            assertThat(result.monthlyBudget()).isEqualByComparingTo("500000.00");
            assertThat(result.alertThreshold()).isEqualTo(70);
            assertThat(result.rateLimitEnabled()).isTrue();
            verify(aiMetricsFastApiGateway).syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    3L,
                    new BigDecimal("500000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    70,
                    true
            ));

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());
            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(11L);
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_DISCORD_ALERT");
            assertThat(auditLog.getTargetType()).isEqualTo("AI_OPS_SETTING");
            assertThat(auditLog.getTargetId()).isEqualTo("1");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.5");
        }
    }

    @Nested
    @DisplayName("rate limit 설정 변경 - updateRateLimit()")
    class UpdateRateLimit {

        @Test
        @DisplayName("rate limit 활성 여부를 변경하고 FastAPI 동기화와 Audit Log 기록을 수행한다")
        void updatesRateLimitAndSynchronizesOpsSetting() {
            AiOpsSetting setting = createAiOpsSetting();
            ReflectionTestUtils.setField(setting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(setting, "selectedModelId", 3L);
            ReflectionTestUtils.setField(setting, "monthlyBudget", new BigDecimal("500000.00"));
            ReflectionTestUtils.setField(setting, "alertEnabled", true);
            ReflectionTestUtils.setField(setting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(setting, "alertThreshold", 70);
            ReflectionTestUtils.setField(setting, "rateLimitEnabled", false);
            ReflectionTestUtils.setField(setting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            given(aiOpsSettingRepository.findSingleton()).willReturn(Optional.of(setting));
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    3L,
                    new BigDecimal("500000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    70,
                    true
            ))).willReturn(new AiMetricsFastApiGateway.OpsSettingSyncResponse(true));

            AiMetricsService.ResponseBudget result = aiMetricsService.updateRateLimit(
                    new AiMetricsService.RequestUpdateRateLimit(true),
                    12L,
                    "10.0.0.6"
            );

            assertThat(result.rateLimitEnabled()).isTrue();
            assertThat(result.selectedModelId()).isEqualTo(3L);
            assertThat(result.monthlyBudget()).isEqualByComparingTo("500000.00");
            assertThat(result.alertEnabled()).isTrue();
            assertThat(result.alertChannel()).isEqualTo(AlertChannelType.DISCORD);
            assertThat(result.alertThreshold()).isEqualTo(70);
            verify(aiMetricsFastApiGateway).syncOpsSetting(new AiMetricsFastApiGateway.OpsSettingSyncRequest(
                    1L,
                    3L,
                    new BigDecimal("500000.00"),
                    true,
                    AlertChannelType.DISCORD,
                    70,
                    true
            ));

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());
            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(12L);
            assertThat(auditLog.getAction()).isEqualTo("UPDATE_RATE_LIMIT");
            assertThat(auditLog.getTargetType()).isEqualTo("AI_OPS_SETTING");
            assertThat(auditLog.getTargetId()).isEqualTo("1");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.6");
        }
    }

    @Nested
    @DisplayName("RAG 문서 목록 조회 - getRagDocuments()")
    class GetRagDocuments {

        @Test
        @DisplayName("RAG 문서 목록을 1-based 페이지 응답으로 변환한다")
        void returnsRagDocumentsWithOneBasedPagination() {
            UUID fileUuid = UUID.fromString("55555555-5555-5555-5555-555555555555");
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-17T09:00:00Z");
            ZonedDateTime updatedAt = ZonedDateTime.parse("2026-06-17T09:10:00Z");
            RagDocument document = RagDocument.upload(
                    10L,
                    fileUuid,
                    "faq.pdf",
                    "/rag/2026/06/faq.pdf",
                    "application/pdf",
                    182_030L
            );
            ReflectionTestUtils.setField(document, "ragDocumentId", 7L);
            ReflectionTestUtils.setField(document, "chunkCount", 12);
            ReflectionTestUtils.setField(document, "indexingProgress", 100);
            ReflectionTestUtils.setField(document, "status", RagDocumentStatusType.COMPLETED);
            ReflectionTestUtils.setField(document, "createdAt", createdAt);
            ReflectionTestUtils.setField(document, "updatedAt", updatedAt);
            PageRequest pageable = PageRequest.of(1, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
            given(ragDocumentRepository.findAll(pageable))
                    .willReturn(new PageImpl<>(List.of(document), pageable, 21));

            AiMetricsService.ResponseRagDocumentList result = aiMetricsService.getRagDocuments(2, 10);

            assertThat(result.page()).isEqualTo(2);
            assertThat(result.size()).isEqualTo(10);
            assertThat(result.totalElements()).isEqualTo(21L);
            assertThat(result.totalPages()).isEqualTo(3);
            assertThat(result.content()).hasSize(1);
            AiMetricsService.ResponseRagDocumentItem item = result.content().getFirst();
            assertThat(item.ragDocumentId()).isEqualTo(7L);
            assertThat(item.uploadedBy()).isEqualTo(10L);
            assertThat(item.fileUuid()).isEqualTo(fileUuid);
            assertThat(item.originalFileName()).isEqualTo("faq.pdf");
            assertThat(item.mimeType()).isEqualTo("application/pdf");
            assertThat(item.fileSize()).isEqualTo(182_030L);
            assertThat(item.chunkCount()).isEqualTo(12);
            assertThat(item.indexingProgress()).isEqualTo(100);
            assertThat(item.status()).isEqualTo(RagDocumentStatusType.COMPLETED);
            assertThat(item.createdAt()).isEqualTo(createdAt);
            assertThat(item.updatedAt()).isEqualTo(updatedAt);
            verify(ragDocumentRepository).findAll(pageable);
        }
    }

    @Nested
    @DisplayName("RAG 문서 업로드 - uploadRagDocument()")
    class UploadRagDocument {

        @Test
        @DisplayName("문서 메타데이터를 저장하고 FastAPI 인덱싱 시작을 호출한다")
        void uploadsRagDocumentAndStartsIndexing() {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "faq.pdf",
                    "application/pdf",
                    "career-wave faq".getBytes()
            );
            given(ragDocumentRepository.existsByStatus(RagDocumentStatusType.INDEXING)).willReturn(false);
            given(ragDocumentRepository.save(org.mockito.ArgumentMatchers.any(RagDocument.class)))
                    .willAnswer(invocation -> {
                        RagDocument document = invocation.getArgument(0);
                        ReflectionTestUtils.setField(document, "ragDocumentId", 9L);
                        ReflectionTestUtils.setField(document, "createdAt", ZonedDateTime.parse("2026-06-17T09:00:00Z"));
                        ReflectionTestUtils.setField(document, "updatedAt", ZonedDateTime.parse("2026-06-17T09:00:00Z"));
                        return document;
                    });
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.startRagIndexing(org.mockito.ArgumentMatchers.any(
                    AiMetricsFastApiGateway.RagIndexStartRequest.class
            ))).willReturn(new AiMetricsFastApiGateway.RagIndexStartResponse(true, 9L));

            AiMetricsService.ResponseRagDocumentDetail result = aiMetricsService.uploadRagDocument(
                    file,
                    10L,
                    "127.0.0.1"
            );

            assertThat(result.ragDocumentId()).isEqualTo(9L);
            assertThat(result.uploadedBy()).isEqualTo(10L);
            assertThat(result.originalFileName()).isEqualTo("faq.pdf");
            assertThat(result.filePath()).contains("/rag/").contains("faq.pdf");
            assertThat(result.mimeType()).isEqualTo("application/pdf");
            assertThat(result.fileSize()).isEqualTo(file.getSize());
            assertThat(result.chunkCount()).isZero();
            assertThat(result.indexingProgress()).isZero();
            assertThat(result.status()).isEqualTo(RagDocumentStatusType.UPLOADED);
            assertThat(result.fileUuid()).isNotNull();
            verify(ragDocumentRepository).existsByStatus(RagDocumentStatusType.INDEXING);

            ArgumentCaptor<RagDocument> documentCaptor = ArgumentCaptor.forClass(RagDocument.class);
            verify(ragDocumentRepository).save(documentCaptor.capture());
            RagDocument savedDocument = documentCaptor.getValue();
            assertThat(savedDocument.getUploadedBy()).isEqualTo(10L);
            assertThat(savedDocument.getOriginalFileName()).isEqualTo("faq.pdf");
            assertThat(savedDocument.getMimeType()).isEqualTo("application/pdf");
            assertThat(savedDocument.getFileSize()).isEqualTo(file.getSize());
            assertThat(savedDocument.getStatus()).isEqualTo(RagDocumentStatusType.UPLOADED);

            ArgumentCaptor<AiMetricsFastApiGateway.RagIndexStartRequest> requestCaptor =
                    ArgumentCaptor.forClass(AiMetricsFastApiGateway.RagIndexStartRequest.class);
            verify(aiMetricsFastApiGateway).startRagIndexing(requestCaptor.capture());
            AiMetricsFastApiGateway.RagIndexStartRequest request = requestCaptor.getValue();
            assertThat(request.ragDocumentId()).isEqualTo(9L);
            assertThat(request.fileUuid()).isEqualTo(savedDocument.getFileUuid());
            assertThat(request.originalFileName()).isEqualTo("faq.pdf");
            assertThat(request.filePath()).isEqualTo(savedDocument.getFilePath());
            assertThat(request.mimeType()).isEqualTo("application/pdf");
            assertThat(request.fileSize()).isEqualTo(file.getSize());
        }
    }

    @Nested
    @DisplayName("RAG 문서 다운로드 정보 조회 - getRagDocumentDownload()")
    class GetRagDocumentDownload {

        @Test
        @DisplayName("RAG 문서 다운로드 정보를 응답으로 변환한다")
        void returnsRagDocumentDownloadInfo() {
            UUID fileUuid = UUID.fromString("66666666-6666-6666-6666-666666666666");
            RagDocument document = RagDocument.upload(
                    10L,
                    fileUuid,
                    "guide.pdf",
                    "/rag/2026/06/guide.pdf",
                    "application/pdf",
                    77_000L
            );
            ReflectionTestUtils.setField(document, "ragDocumentId", 8L);
            given(ragDocumentRepository.findById(8L)).willReturn(Optional.of(document));

            AiMetricsService.ResponseRagDocumentDownload result = aiMetricsService.getRagDocumentDownload(8L);

            assertThat(result.ragDocumentId()).isEqualTo(8L);
            assertThat(result.originalFileName()).isEqualTo("guide.pdf");
            assertThat(result.fileUuid()).isEqualTo(fileUuid);
            assertThat(result.mimeType()).isEqualTo("application/pdf");
            assertThat(result.fileSize()).isEqualTo(77_000L);
            assertThat(result.downloadUrl()).isEqualTo("/api/v1/admin/ai-metrics/rag-documents/8/download");
            verify(ragDocumentRepository).findById(8L);
        }
    }

    @Nested
    @DisplayName("RAG 문서 삭제 - deleteRagDocument()")
    class DeleteRagDocument {

        @Test
        @DisplayName("RAG 문서를 삭제하고 FastAPI 인덱스 삭제와 Audit Log 기록을 수행한다")
        void deletesRagDocumentAndDeletesFastApiIndex() {
            UUID fileUuid = UUID.fromString("77777777-7777-7777-7777-777777777777");
            RagDocument document = RagDocument.upload(
                    10L,
                    fileUuid,
                    "old-guide.pdf",
                    "/rag/2026/06/old-guide.pdf",
                    "application/pdf",
                    88_000L
            );
            ReflectionTestUtils.setField(document, "ragDocumentId", 8L);
            given(ragDocumentRepository.findById(8L)).willReturn(Optional.of(document));
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.deleteRagIndex(new AiMetricsFastApiGateway.RagIndexDeleteRequest(8L, fileUuid, "/rag/2026/06/old-guide.pdf")))
                    .willReturn(new AiMetricsFastApiGateway.RagIndexDeleteResponse(true, 8L));

            AiMetricsService.ResponseRagDocumentDelete result = aiMetricsService.deleteRagDocument(
                    8L,
                    13L,
                    "10.0.0.7"
            );

            assertThat(result.ragDocumentId()).isEqualTo(8L);
            assertThat(result.deleted()).isTrue();
            verify(ragDocumentRepository).findById(8L);
            verify(ragDocumentRepository).delete(document);
            verify(aiMetricsFastApiGateway).deleteRagIndex(new AiMetricsFastApiGateway.RagIndexDeleteRequest(8L, fileUuid, "/rag/2026/06/old-guide.pdf"));

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());
            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(13L);
            assertThat(auditLog.getAction()).isEqualTo("DELETE_RAG_DOCUMENT");
            assertThat(auditLog.getTargetType()).isEqualTo("RAG_DOCUMENT");
            assertThat(auditLog.getTargetId()).isEqualTo("8");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.7");
        }
    }

    @Nested
    @DisplayName("조회 조건 검증")
    class ValidateQueryParameters {

        @Test
        @DisplayName("from이 to보다 늦으면 BAD_REQUEST 예외를 반환한다")
        void rejectsInvalidPeriodRange() {
            assertThatThrownBy(() -> aiMetricsService.getSummary(
                    "2026-06-18T00:00:00Z",
                    "2026-06-17T00:00:00Z",
                    AiFeatureType.DOCUMENT
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }

        @Test
        @DisplayName("from 또는 to가 ISO-8601 Instant 형식이 아니면 BAD_REQUEST 예외를 반환한다")
        void rejectsInvalidPeriodFormat() {
            assertThatThrownBy(() -> aiMetricsService.getDomainUsage("2026-06-01", "2026-06-17T00:00:00Z"))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }

        @Test
        @DisplayName("interval이 HOURLY 또는 DAILY가 아니면 BAD_REQUEST 예외를 반환한다")
        void rejectsInvalidInterval() {
            assertThatThrownBy(() -> aiMetricsService.getTokenTrend(
                    "2026-06-01T00:00:00Z",
                    "2026-06-17T00:00:00Z",
                    AiFeatureType.INTERVIEW,
                    "WEEKLY"
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }

        @Test
        @DisplayName("limit이 1보다 작으면 BAD_REQUEST 예외를 반환한다")
        void rejectsInvalidLimit() {
            assertThatThrownBy(() -> aiMetricsService.getHeavyUsers(
                    "2026-06-01T00:00:00Z",
                    "2026-06-17T00:00:00Z",
                    AiFeatureType.DOCUMENT,
                    0
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }

        @Test
        @DisplayName("page 또는 size가 1보다 작으면 BAD_REQUEST 예외를 반환한다")
        void rejectsInvalidPageAndSize() {
            assertThatThrownBy(() -> aiMetricsService.getUsageLogs(AiFeatureType.DOCUMENT, 0, 10))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);

            assertThatThrownBy(() -> aiMetricsService.getRagDocuments(1, 0))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("운영 정책 입력 예외")
    class OpsSettingValidationExceptions {

        @Test
        @DisplayName("월 예산이 0 이하이면 INVALID_MONTHLY_BUDGET 예외를 반환한다")
        void rejectsInvalidMonthlyBudget() {
            assertThatThrownBy(() -> aiMetricsService.updateBudget(
                    new AiMetricsService.RequestUpdateBudget(3L, BigDecimal.ZERO, 80),
                    10L,
                    "127.0.0.1"
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.INVALID_MONTHLY_BUDGET);

            verify(aiModelRepository, never()).existsById(org.mockito.ArgumentMatchers.anyLong());
            verify(aiOpsSettingRepository, never()).findSingleton();
        }

        @Test
        @DisplayName("알림 임계치가 1~100 범위를 벗어나면 INVALID_ALERT_THRESHOLD 예외를 반환한다")
        void rejectsInvalidAlertThreshold() {
            assertThatThrownBy(() -> aiMetricsService.updateBudget(
                    new AiMetricsService.RequestUpdateBudget(3L, new BigDecimal("1000000.00"), 101),
                    10L,
                    "127.0.0.1"
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.INVALID_ALERT_THRESHOLD);

            verify(aiModelRepository, never()).existsById(org.mockito.ArgumentMatchers.anyLong());
            verify(aiOpsSettingRepository, never()).findSingleton();
        }
    }

    @Nested
    @DisplayName("도메인 리소스 없음 예외")
    class NotFoundExceptions {

        @Test
        @DisplayName("선택한 AI 모델이 없으면 AI_MODEL_NOT_FOUND 예외를 반환한다")
        void rejectsMissingAiModel() {
            given(aiModelRepository.existsById(99L)).willReturn(false);

            assertThatThrownBy(() -> aiMetricsService.updateBudget(
                    new AiMetricsService.RequestUpdateBudget(99L, new BigDecimal("1000000.00"), 80),
                    10L,
                    "127.0.0.1"
            ))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.AI_MODEL_NOT_FOUND);

            verify(aiOpsSettingRepository, never()).findSingleton();
        }

        @Test
        @DisplayName("AI 운영 설정이 없으면 AI_OPS_SETTING_NOT_FOUND 예외를 반환한다")
        void rejectsMissingAiOpsSetting() {
            given(aiOpsSettingRepository.findSingleton()).willReturn(Optional.empty());

            assertThatThrownBy(() -> aiMetricsService.getBudget())
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.AI_OPS_SETTING_NOT_FOUND);
        }

        @Test
        @DisplayName("RAG 문서가 없으면 RAG_DOCUMENT_NOT_FOUND 예외를 반환한다")
        void rejectsMissingRagDocument() {
            given(ragDocumentRepository.findById(404L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> aiMetricsService.getRagDocumentDownload(404L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.RAG_DOCUMENT_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("RAG 문서 처리 예외")
    class RagDocumentOperationExceptions {

        @Test
        @DisplayName("인덱싱 중인 RAG 문서가 있으면 RAG_DOCUMENT_ALREADY_INDEXING 예외를 반환한다")
        void rejectsUploadWhenRagDocumentAlreadyIndexing() {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "faq.pdf",
                    "application/pdf",
                    "career-wave faq".getBytes()
            );
            given(ragDocumentRepository.existsByStatus(RagDocumentStatusType.INDEXING)).willReturn(true);

            assertThatThrownBy(() -> aiMetricsService.uploadRagDocument(file, 10L, "127.0.0.1"))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.RAG_DOCUMENT_ALREADY_INDEXING);

            verify(ragDocumentRepository, never()).save(org.mockito.ArgumentMatchers.any(RagDocument.class));
        }

        @Test
        @DisplayName("RAG 문서 저장 중 예외가 발생하면 RAG_DOCUMENT_UPLOAD_FAILED 예외를 반환한다")
        void convertsUploadRuntimeExceptionToRagDocumentUploadFailed() {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "faq.pdf",
                    "application/pdf",
                    "career-wave faq".getBytes()
            );
            given(ragDocumentRepository.existsByStatus(RagDocumentStatusType.INDEXING)).willReturn(false);
            given(ragDocumentRepository.save(org.mockito.ArgumentMatchers.any(RagDocument.class)))
                    .willThrow(new IllegalStateException("storage failed"));

            assertThatThrownBy(() -> aiMetricsService.uploadRagDocument(file, 10L, "127.0.0.1"))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.RAG_DOCUMENT_UPLOAD_FAILED);
        }

        @Test
        @DisplayName("RAG 문서 삭제 중 데이터 접근 예외가 발생하면 RAG_DOCUMENT_DELETE_FAILED 예외를 반환한다")
        void convertsDeleteDataAccessExceptionToRagDocumentDeleteFailed() {
            RagDocument document = RagDocument.upload(
                    10L,
                    UUID.fromString("88888888-8888-8888-8888-888888888888"),
                    "old-guide.pdf",
                    "/rag/2026/06/old-guide.pdf",
                    "application/pdf",
                    88_000L
            );
            ReflectionTestUtils.setField(document, "ragDocumentId", 8L);
            given(ragDocumentRepository.findById(8L)).willReturn(Optional.of(document));
            org.mockito.BDDMockito.willThrow(new DataAccessResourceFailureException("delete failed"))
                    .given(ragDocumentRepository)
                    .delete(document);

            assertThatThrownBy(() -> aiMetricsService.deleteRagDocument(8L, 13L, "10.0.0.7"))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(AiMetricsErrorCode.RAG_DOCUMENT_DELETE_FAILED);

            verify(aiMetricsFastApiGateway, never()).deleteRagIndex(org.mockito.ArgumentMatchers.any());
            verify(auditLogRepository, never()).save(org.mockito.ArgumentMatchers.any(AuditLog.class));
        }
    }

    @Nested
    @DisplayName("AI 사용량 집계 책임 분리")
    class UsageAggregationResponsibility {

        @Test
        @DisplayName("Spring은 AI 사용량을 직접 집계하지 않고 FastAPI 집계 API를 호출한다")
        void delegatesUsageAggregationToFastApiGateway() {
            String from = "2026-06-01T00:00:00Z";
            String to = "2026-06-17T23:59:59Z";
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.getSummary(new AiMetricsFastApiGateway.SummaryRequest(
                    from,
                    to,
                    null
            ))).willReturn(new AiMetricsFastApiGateway.SummaryResponse(
                    10L,
                    3_000L,
                    1_000L,
                    new BigDecimal("1.20"),
                    6L,
                    4L,
                    3L,
                    "gpt-4o-mini"
            ));

            AiMetricsService.ResponseSummary result = aiMetricsService.getSummary(from, to, null);

            assertThat(result.totalRequests()).isEqualTo(10L);
            verify(aiMetricsFastApiGateway).getSummary(new AiMetricsFastApiGateway.SummaryRequest(from, to, null));
            verifyNoInteractions(aiModelRepository, aiOpsSettingRepository, ragDocumentRepository, auditLogRepository);
        }
    }

    @Nested
    @DisplayName("RAG 상태 전이 조회")
    class RagDocumentStatusTransition {

        @Test
        @DisplayName("UPLOADED, INDEXING, COMPLETED, FAILED 상태를 조회 응답으로 보존한다")
        void preservesRagDocumentTransitionStatuses() {
            ZonedDateTime now = ZonedDateTime.parse("2026-06-17T09:00:00Z");
            List<RagDocument> documents = List.of(
                    createRagDocument(1L, "uploaded.pdf", RagDocumentStatusType.UPLOADED, 0, 0, now),
                    createRagDocument(2L, "indexing.pdf", RagDocumentStatusType.INDEXING, 40, 3, now),
                    createRagDocument(3L, "completed.pdf", RagDocumentStatusType.COMPLETED, 100, 12, now),
                    createRagDocument(4L, "failed.pdf", RagDocumentStatusType.FAILED, 60, 5, now)
            );
            PageRequest pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
            given(ragDocumentRepository.findAll(pageable))
                    .willReturn(new PageImpl<>(documents, pageable, documents.size()));

            AiMetricsService.ResponseRagDocumentList result = aiMetricsService.getRagDocuments(1, 20);

            assertThat(result.content())
                    .extracting(AiMetricsService.ResponseRagDocumentItem::status)
                    .containsExactly(
                            RagDocumentStatusType.UPLOADED,
                            RagDocumentStatusType.INDEXING,
                            RagDocumentStatusType.COMPLETED,
                            RagDocumentStatusType.FAILED
                    );
            assertThat(result.content().get(0).indexingProgress()).isZero();
            assertThat(result.content().get(1).indexingProgress()).isEqualTo(40);
            assertThat(result.content().get(2).indexingProgress()).isEqualTo(100);
            assertThat(result.content().get(3).indexingProgress()).isEqualTo(60);
        }
    }

    @Nested
    @DisplayName("운영 정책 변경 Audit Log 기록")
    class OpsSettingAuditLog {

        @Test
        @DisplayName("예산, Discord 알림, rate limit 변경은 각각 Audit Log를 기록한다")
        void recordsAuditLogsForOpsSettingChanges() {
            AiOpsSetting budgetSetting = createAiOpsSetting();
            ReflectionTestUtils.setField(budgetSetting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(budgetSetting, "selectedModelId", 3L);
            ReflectionTestUtils.setField(budgetSetting, "monthlyBudget", new BigDecimal("500000.00"));
            ReflectionTestUtils.setField(budgetSetting, "alertEnabled", false);
            ReflectionTestUtils.setField(budgetSetting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(budgetSetting, "alertThreshold", 70);
            ReflectionTestUtils.setField(budgetSetting, "rateLimitEnabled", false);
            ReflectionTestUtils.setField(budgetSetting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            AiOpsSetting discordSetting = createAiOpsSetting();
            ReflectionTestUtils.setField(discordSetting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(discordSetting, "selectedModelId", 4L);
            ReflectionTestUtils.setField(discordSetting, "monthlyBudget", new BigDecimal("1200000.00"));
            ReflectionTestUtils.setField(discordSetting, "alertEnabled", false);
            ReflectionTestUtils.setField(discordSetting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(discordSetting, "alertThreshold", 85);
            ReflectionTestUtils.setField(discordSetting, "rateLimitEnabled", false);
            ReflectionTestUtils.setField(discordSetting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            AiOpsSetting rateLimitSetting = createAiOpsSetting();
            ReflectionTestUtils.setField(rateLimitSetting, "aiOpsSettingId", 1L);
            ReflectionTestUtils.setField(rateLimitSetting, "selectedModelId", 4L);
            ReflectionTestUtils.setField(rateLimitSetting, "monthlyBudget", new BigDecimal("1200000.00"));
            ReflectionTestUtils.setField(rateLimitSetting, "alertEnabled", true);
            ReflectionTestUtils.setField(rateLimitSetting, "alertChannel", AlertChannelType.DISCORD);
            ReflectionTestUtils.setField(rateLimitSetting, "alertThreshold", 85);
            ReflectionTestUtils.setField(rateLimitSetting, "rateLimitEnabled", false);
            ReflectionTestUtils.setField(rateLimitSetting, "updatedAt", ZonedDateTime.parse("2026-06-17T12:00:00Z"));
            given(aiModelRepository.existsById(4L)).willReturn(true);
            given(aiOpsSettingRepository.findSingleton()).willReturn(
                    Optional.of(budgetSetting),
                    Optional.of(discordSetting),
                    Optional.of(rateLimitSetting)
            );
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.syncOpsSetting(org.mockito.ArgumentMatchers.any(
                    AiMetricsFastApiGateway.OpsSettingSyncRequest.class
            ))).willReturn(new AiMetricsFastApiGateway.OpsSettingSyncResponse(true));

            aiMetricsService.updateBudget(
                    new AiMetricsService.RequestUpdateBudget(4L, new BigDecimal("1200000.00"), 85),
                    10L,
                    "127.0.0.1"
            );
            aiMetricsService.updateDiscordAlert(
                    new AiMetricsService.RequestUpdateDiscordAlert(true),
                    10L,
                    "127.0.0.1"
            );
            aiMetricsService.updateRateLimit(
                    new AiMetricsService.RequestUpdateRateLimit(true),
                    10L,
                    "127.0.0.1"
            );

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository, org.mockito.Mockito.times(3)).save(auditLogCaptor.capture());
            assertThat(auditLogCaptor.getAllValues())
                    .extracting(AuditLog::getAction)
                    .containsExactly(
                            "UPDATE_AI_BUDGET",
                            "UPDATE_DISCORD_ALERT",
                            "UPDATE_RATE_LIMIT"
                    );
            assertThat(auditLogCaptor.getAllValues())
                    .extracting(AuditLog::getTargetType)
                    .containsOnly("AI_OPS_SETTING");
            assertThat(auditLogCaptor.getAllValues())
                    .extracting(AuditLog::getTargetId)
                    .containsOnly("1");
        }
    }

    @Nested
    @DisplayName("RAG 문서 삭제 Audit Log 기록")
    class RagDocumentDeleteAuditLog {

        @Test
        @DisplayName("RAG 문서 삭제는 Audit Log를 기록한다")
        void recordsAuditLogForRagDocumentDelete() {
            RagDocument document = RagDocument.upload(
                    10L,
                    UUID.fromString("99999999-9999-9999-9999-999999999999"),
                    "delete-target.pdf",
                    "/rag/2026/06/delete-target.pdf",
                    "application/pdf",
                    90_000L
            );
            ReflectionTestUtils.setField(document, "ragDocumentId", 15L);
            given(ragDocumentRepository.findById(15L)).willReturn(Optional.of(document));
            given(aiMetricsFastApiGatewayProvider.getIfAvailable()).willReturn(aiMetricsFastApiGateway);
            given(aiMetricsFastApiGateway.deleteRagIndex(new AiMetricsFastApiGateway.RagIndexDeleteRequest(
                    15L,
                    UUID.fromString("99999999-9999-9999-9999-999999999999"),
                    "/rag/2026/06/delete-target.pdf"
            )))
                    .willReturn(new AiMetricsFastApiGateway.RagIndexDeleteResponse(true, 15L));

            aiMetricsService.deleteRagDocument(15L, 14L, "10.0.0.8");

            ArgumentCaptor<AuditLog> auditLogCaptor = ArgumentCaptor.forClass(AuditLog.class);
            verify(auditLogRepository).save(auditLogCaptor.capture());
            AuditLog auditLog = auditLogCaptor.getValue();
            assertThat(auditLog.getAdminId()).isEqualTo(14L);
            assertThat(auditLog.getAction()).isEqualTo("DELETE_RAG_DOCUMENT");
            assertThat(auditLog.getTargetType()).isEqualTo("RAG_DOCUMENT");
            assertThat(auditLog.getTargetId()).isEqualTo("15");
            assertThat(auditLog.getIpAddress()).isEqualTo("10.0.0.8");
        }
    }

    private AiOpsSetting createAiOpsSetting() {
        try {
            var constructor = AiOpsSetting.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private RagDocument createRagDocument(
            Long ragDocumentId,
            String originalFileName,
            RagDocumentStatusType status,
            int indexingProgress,
            int chunkCount,
            ZonedDateTime timestamp
    ) {
        RagDocument document = RagDocument.upload(
                10L,
                UUID.randomUUID(),
                originalFileName,
                "/rag/2026/06/" + originalFileName,
                "application/pdf",
                10_000L
        );
        ReflectionTestUtils.setField(document, "ragDocumentId", ragDocumentId);
        ReflectionTestUtils.setField(document, "status", status);
        ReflectionTestUtils.setField(document, "indexingProgress", indexingProgress);
        ReflectionTestUtils.setField(document, "chunkCount", chunkCount);
        ReflectionTestUtils.setField(document, "createdAt", timestamp);
        ReflectionTestUtils.setField(document, "updatedAt", timestamp);
        return document;
    }
}
