package kr.co.carrer.admin.audit.service.impl;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.exception.AuditLogErrorCode;
import kr.co.carrer.admin.audit.repository.AuditLogQueryRepository;
import kr.co.carrer.admin.audit.service.AuditLogService;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceImplTest {

    @InjectMocks
    private AuditLogServiceImpl auditLogService;

    @Mock
    private AuditLogQueryRepository auditLogQueryRepository;

    @Nested
    @DisplayName("감사 로그 요약 조회 - getSummary()")
    class GetSummary {

        @Test
        @DisplayName("기간 조건으로 조회한 요약 집계 결과를 응답으로 반환한다")
        void returnsSummaryAggregate() {
            ZonedDateTime from = ZonedDateTime.parse("2026-06-10T00:00:00Z");
            ZonedDateTime to = ZonedDateTime.parse("2026-06-16T23:59:59Z");

            given(auditLogQueryRepository.getSummary(from, to))
                .willReturn(new AuditLogQueryRepository.SummaryAggregate(
                    1250L,
                    320L,
                    12L,
                    610L,
                    308L,
                    820L,
                    210L,
                    180L,
                    40L
                ));

            AuditLogService.ResponseSummary result = auditLogService.getSummary(from, to);

            verify(auditLogQueryRepository).getSummary(from, to);
            assertThat(result.totalCount()).isEqualTo(1250L);
            assertThat(result.adminActivityCount()).isEqualTo(320L);
            assertThat(result.adminManagementCount()).isEqualTo(12L);
            assertThat(result.aiMetricsSystemCount()).isEqualTo(610L);
            assertThat(result.scrapingSystemCount()).isEqualTo(308L);
            assertThat(result.infoCount()).isEqualTo(820L);
            assertThat(result.warnCount()).isEqualTo(210L);
            assertThat(result.errorCount()).isEqualTo(180L);
            assertThat(result.successCount()).isEqualTo(40L);
        }
    }

    @Nested
    @DisplayName("감사 로그 목록 조회 - getAuditLogs()")
    class GetAuditLogs {

        @Test
        @DisplayName("1-based page를 내부 Pageable로 변환해 목록 조회 결과를 반환한다")
        void returnsAuditLogPageWithOneBasedPaging() {
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T10:00:00Z");
            AuditLog auditLog = createAuditLog(
                101L,
                1L,
                AuditLogType.ADMIN_ACTIVITY,
                "UPDATE_ADMIN_ROLE",
                "ADMIN",
                "2",
                "10.0.0.1",
                AuditLogSeverity.INFO,
                "adminRole changed from BACKEND to CS",
                createdAt
            );

            PageRequest pageable = PageRequest.of(0, 20);
            Page<AuditLog> expectedPage = new PageImpl<>(List.of(auditLog), pageable, 1);

            given(auditLogQueryRepository.findAuditLogs(
                AuditLogType.ADMIN_ACTIVITY,
                AuditLogSeverity.INFO,
                "UPDATE_ADMIN_ROLE",
                null,
                null,
                pageable
            )).willReturn(expectedPage);

            Page<AuditLog> result = auditLogService.getAuditLogs(
                "ADMIN_ACTIVITY",
                "INFO",
                "UPDATE_ADMIN_ROLE",
                null,
                null,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                AuditLogType.ADMIN_ACTIVITY,
                AuditLogSeverity.INFO,
                "UPDATE_ADMIN_ROLE",
                null,
                null,
                pageable
            );
            assertThat(result.getTotalElements()).isEqualTo(1L);
            assertThat(result.getTotalPages()).isEqualTo(1);
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getAuditLogId()).isEqualTo(101L);
            assertThat(result.getContent().getFirst().getLogType()).isEqualTo(AuditLogType.ADMIN_ACTIVITY);
            assertThat(result.getContent().getFirst().getSeverity()).isEqualTo(AuditLogSeverity.INFO);
        }

        @Test
        @DisplayName("logType 필터를 enum으로 해석해 query repository에 전달한다")
        void passesLogTypeFilterToQueryRepository() {
            AuditLog auditLog = createAuditLog(
                102L,
                3L,
                AuditLogType.ADMIN_MANAGEMENT,
                "CREATE_ADMIN",
                "ADMIN",
                "9",
                "10.0.0.3",
                AuditLogSeverity.INFO,
                "admin account created",
                ZonedDateTime.parse("2026-06-15T10:30:00Z")
            );

            PageRequest pageable = PageRequest.of(0, 20);
            given(auditLogQueryRepository.findAuditLogs(
                AuditLogType.ADMIN_MANAGEMENT,
                null,
                null,
                null,
                null,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                "ADMIN_MANAGEMENT",
                null,
                null,
                null,
                null,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                AuditLogType.ADMIN_MANAGEMENT,
                null,
                null,
                null,
                null,
                pageable
            );
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getLogType()).isEqualTo(AuditLogType.ADMIN_MANAGEMENT);
        }

        @Test
        @DisplayName("severity 필터를 enum으로 해석해 query repository에 전달한다")
        void passesSeverityFilterToQueryRepository() {
            AuditLog auditLog = createAuditLog(
                103L,
                4L,
                AuditLogType.ADMIN_ACTIVITY,
                "DELETE_ADMIN",
                "ADMIN",
                "11",
                "10.0.0.4",
                AuditLogSeverity.ERROR,
                "admin account delete failed",
                ZonedDateTime.parse("2026-06-15T11:30:00Z")
            );

            PageRequest pageable = PageRequest.of(0, 20);
            given(auditLogQueryRepository.findAuditLogs(
                null,
                AuditLogSeverity.ERROR,
                null,
                null,
                null,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                null,
                "ERROR",
                null,
                null,
                null,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                null,
                AuditLogSeverity.ERROR,
                null,
                null,
                null,
                pageable
            );
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getSeverity()).isEqualTo(AuditLogSeverity.ERROR);
        }

        @Test
        @DisplayName("keyword 필터를 query repository에 그대로 전달한다")
        void passesKeywordFilterToQueryRepository() {
            AuditLog auditLog = createAuditLog(
                104L,
                5L,
                AuditLogType.ADMIN_ACTIVITY,
                "UPDATE_ADMIN_ROLE",
                "ADMIN",
                "12",
                "10.0.0.5",
                AuditLogSeverity.INFO,
                "adminRole changed from BACKEND to MASTER",
                ZonedDateTime.parse("2026-06-15T12:00:00Z")
            );

            PageRequest pageable = PageRequest.of(0, 20);
            given(auditLogQueryRepository.findAuditLogs(
                null,
                null,
                "BACKEND",
                null,
                null,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                null,
                null,
                "BACKEND",
                null,
                null,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                null,
                null,
                "BACKEND",
                null,
                null,
                pageable
            );
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getDetail()).contains("BACKEND");
        }

        @Test
        @DisplayName("keyword가 공백-only이면 필터를 적용하지 않는다")
        void ignoresBlankOnlyKeywordFilter() {
            AuditLog auditLog = createAuditLog(
                105L,
                6L,
                AuditLogType.ADMIN_ACTIVITY,
                "READ_ADMIN_DETAIL",
                "ADMIN",
                "13",
                "10.0.0.6",
                AuditLogSeverity.INFO,
                "admin detail viewed",
                ZonedDateTime.parse("2026-06-15T12:30:00Z")
            );

            PageRequest pageable = PageRequest.of(0, 20);
            given(auditLogQueryRepository.findAuditLogs(
                null,
                null,
                null,
                null,
                null,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                null,
                null,
                "   ",
                null,
                null,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                null,
                null,
                null,
                null,
                null,
                pageable
            );
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getAuditLogId()).isEqualTo(105L);
        }

        @Test
        @DisplayName("from, to 기간 필터를 query repository에 전달한다")
        void passesDateRangeFilterToQueryRepository() {
            ZonedDateTime from = ZonedDateTime.parse("2026-06-10T00:00:00Z");
            ZonedDateTime to = ZonedDateTime.parse("2026-06-16T23:59:59Z");
            AuditLog auditLog = createAuditLog(
                106L,
                8L,
                AuditLogType.SCRAPING_SYSTEM,
                "SYNC_PIPELINE",
                "PIPELINE",
                "51",
                "10.0.0.7",
                AuditLogSeverity.SUCCESS,
                "pipeline sync completed",
                ZonedDateTime.parse("2026-06-15T13:00:00Z")
            );

            PageRequest pageable = PageRequest.of(0, 20);
            given(auditLogQueryRepository.findAuditLogs(
                null,
                null,
                null,
                from,
                to,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                null,
                null,
                null,
                from,
                to,
                1,
                20
            );

            verify(auditLogQueryRepository).findAuditLogs(
                null,
                null,
                null,
                from,
                to,
                pageable
            );
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().getAuditLogId()).isEqualTo(106L);
        }

        @Test
        @DisplayName("from이 to보다 이후면 INVALID_DATE_RANGE를 던진다")
        void throwsBadRequestWhenFromIsAfterTo() {
            ZonedDateTime from = ZonedDateTime.parse("2026-06-17T00:00:00Z");
            ZonedDateTime to = ZonedDateTime.parse("2026-06-16T23:59:59Z");

            assertThatThrownBy(() -> auditLogService.getAuditLogs(
                null,
                null,
                null,
                from,
                to,
                1,
                20
            ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(AuditLogErrorCode.INVALID_DATE_RANGE);

            verifyNoInteractions(auditLogQueryRepository);
        }

        @Test
        @DisplayName("외부 1-based page는 내부 Pageable에서 page - 1로 변환된다")
        void convertsOneBasedPageToInternalPageable() {
            AuditLog auditLog = createAuditLog(
                107L,
                9L,
                AuditLogType.ADMIN_ACTIVITY,
                "READ_AUDIT_LOG",
                "AUDIT_LOG",
                "107",
                "10.0.0.9",
                AuditLogSeverity.INFO,
                "audit log viewed",
                ZonedDateTime.parse("2026-06-15T14:00:00Z")
            );

            PageRequest pageable = PageRequest.of(2, 50);
            given(auditLogQueryRepository.findAuditLogs(
                null,
                null,
                null,
                null,
                null,
                pageable
            )).willReturn(new PageImpl<>(List.of(auditLog), pageable, 1));

            Page<AuditLog> result = auditLogService.getAuditLogs(
                null,
                null,
                null,
                null,
                null,
                3,
                50
            );

            verify(auditLogQueryRepository).findAuditLogs(
                null,
                null,
                null,
                null,
                null,
                pageable
            );
            assertThat(result.getNumber()).isEqualTo(2);
            assertThat(result.getSize()).isEqualTo(50);
        }

        @Test
        @DisplayName("유효하지 않은 logType이면 INVALID_AUDIT_LOG_TYPE을 던진다")
        void throwsInvalidAuditLogTypeWhenLogTypeIsUnsupported() {
            assertThatThrownBy(() -> auditLogService.getAuditLogs(
                "INVALID_TYPE",
                null,
                null,
                null,
                null,
                1,
                20
            ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(AuditLogErrorCode.INVALID_AUDIT_LOG_TYPE);

            verifyNoInteractions(auditLogQueryRepository);
        }

        @Test
        @DisplayName("유효하지 않은 severity면 INVALID_AUDIT_LOG_SEVERITY를 던진다")
        void throwsInvalidAuditLogSeverityWhenSeverityIsUnsupported() {
            assertThatThrownBy(() -> auditLogService.getAuditLogs(
                null,
                "INVALID_SEVERITY",
                null,
                null,
                null,
                1,
                20
            ))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(AuditLogErrorCode.INVALID_AUDIT_LOG_SEVERITY);

            verifyNoInteractions(auditLogQueryRepository);
        }
    }

    @Nested
    @DisplayName("감사 로그 상세 조회 - getAuditLogDetail()")
    class GetAuditLogDetail {

        @Test
        @DisplayName("감사 로그 ID로 조회한 상세 결과를 반환한다")
        void returnsAuditLogDetail() {
            ZonedDateTime createdAt = ZonedDateTime.parse("2026-06-15T11:00:00Z");
            AuditLog auditLog = createAuditLog(
                201L,
                7L,
                AuditLogType.ADMIN_MANAGEMENT,
                "CREATE_ADMIN",
                "ADMIN",
                "15",
                "10.0.0.8",
                AuditLogSeverity.SUCCESS,
                "admin account created",
                createdAt
            );

            given(auditLogQueryRepository.findAuditLogById(201L))
                .willReturn(Optional.of(auditLog));

            AuditLog result = auditLogService.getAuditLogDetail(201L);

            verify(auditLogQueryRepository).findAuditLogById(201L);
            assertThat(result.getAuditLogId()).isEqualTo(201L);
            assertThat(result.getAdminId()).isEqualTo(7L);
            assertThat(result.getLogType()).isEqualTo(AuditLogType.ADMIN_MANAGEMENT);
            assertThat(result.getAction()).isEqualTo("CREATE_ADMIN");
            assertThat(result.getTargetType()).isEqualTo("ADMIN");
            assertThat(result.getTargetId()).isEqualTo("15");
            assertThat(result.getIpAddress()).isEqualTo("10.0.0.8");
            assertThat(result.getSeverity()).isEqualTo(AuditLogSeverity.SUCCESS);
            assertThat(result.getDetail()).isEqualTo("admin account created");
            assertThat(result.getCreatedAt()).isEqualTo(createdAt);
        }

        @Test
        @DisplayName("존재하지 않는 감사 로그면 AUDIT_LOG_NOT_FOUND를 던진다")
        void throwsAuditLogNotFoundWhenDetailDoesNotExist() {
            given(auditLogQueryRepository.findAuditLogById(999L))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> auditLogService.getAuditLogDetail(999L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(AuditLogErrorCode.AUDIT_LOG_NOT_FOUND);

            verify(auditLogQueryRepository).findAuditLogById(999L);
        }
    }

    private AuditLog createAuditLog(
        Long auditLogId,
        Long adminId,
        AuditLogType logType,
        String action,
        String targetType,
        String targetId,
        String ipAddress,
        AuditLogSeverity severity,
        String detail,
        ZonedDateTime createdAt
    ) {
        try {
            var constructor = AuditLog.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            AuditLog auditLog = constructor.newInstance();
            ReflectionTestUtils.setField(auditLog, "auditLogId", auditLogId);
            ReflectionTestUtils.setField(auditLog, "adminId", adminId);
            ReflectionTestUtils.setField(auditLog, "logType", logType);
            ReflectionTestUtils.setField(auditLog, "action", action);
            ReflectionTestUtils.setField(auditLog, "targetType", targetType);
            ReflectionTestUtils.setField(auditLog, "targetId", targetId);
            ReflectionTestUtils.setField(auditLog, "ipAddress", ipAddress);
            ReflectionTestUtils.setField(auditLog, "severity", severity);
            ReflectionTestUtils.setField(auditLog, "detail", detail);
            ReflectionTestUtils.setField(auditLog, "createdAt", createdAt);
            return auditLog;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
