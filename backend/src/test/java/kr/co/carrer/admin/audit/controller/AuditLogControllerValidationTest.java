package kr.co.carrer.admin.audit.controller;

import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.service.AuditLogService;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZonedDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditLogController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class AuditLogControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private IpAclPort ipAclPort;

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("keyword가 100자를 초과하면 400을 반환한다")
    void keywordTooLongReturnsBadRequest() throws Exception {
        String keyword = "a".repeat(101);

        mockMvc.perform(
                get("/api/v1/admin/audit-logs")
                    .param("keyword", keyword)
                    .param("page", "1")
                    .param("size", "20")
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.statusCode").value(400))
            .andExpect(jsonPath("$.data.keyword").exists());
    }

    @Test
    @WithMockUser(roles = {"ADMIN", "MASTER"})
    @DisplayName("size가 100을 초과하면 400을 반환한다")
    void sizeTooLargeReturnsBadRequest() throws Exception {
        mockMvc.perform(
                get("/api/v1/admin/audit-logs")
                    .param("page", "1")
                    .param("size", "101")
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.statusCode").value(400))
            .andExpect(jsonPath("$.data.size").exists());
    }

    @Nested
    @DisplayName("권한 허용")
    class AuthorizationAllowed {

        @Test
        @WithMockUser(roles = {"ADMIN", "MASTER"})
        @DisplayName("ROLE_ADMIN + MASTER는 감사 로그 목록 조회가 가능하다")
        void masterRoleCanAccessAuditLogs() throws Exception {
            given(auditLogService.getAuditLogs(
                anyString(),
                anyString(),
                anyString(),
                any(),
                any(),
                anyInt(),
                anyInt()
            )).willReturn(new PageImpl<>(List.of(createAuditLog(301L))));

            mockMvc.perform(
                    get("/api/v1/admin/audit-logs")
                        .param("logType", "ADMIN_ACTIVITY")
                        .param("severity", "INFO")
                        .param("keyword", "UPDATE")
                        .param("from", "2026-06-10T00:00:00Z")
                        .param("to", "2026-06-16T23:59:59Z")
                        .param("page", "1")
                        .param("size", "20")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @WithMockUser(roles = {"ADMIN", "BACKEND"})
        @DisplayName("ROLE_ADMIN + BACKEND는 감사 로그 목록 조회가 가능하다")
        void backendRoleCanAccessAuditLogs() throws Exception {
            given(auditLogService.getAuditLogs(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                anyInt(),
                anyInt()
            )).willReturn(new PageImpl<>(List.of(createAuditLog(302L))));

            mockMvc.perform(
                    get("/api/v1/admin/audit-logs")
                        .param("page", "1")
                        .param("size", "20")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("권한 차단")
    class AuthorizationDenied {

        @Test
        @DisplayName("ROLE_USER는 감사 로그 목록 조회가 차단된다")
        void userRoleIsForbidden() throws Exception {
            mockMvc.perform(
                    get("/api/v1/admin/audit-logs")
                        .with(user("blocked-user").roles("USER"))
                        .param("page", "1")
                        .param("size", "20")
                )
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(403))
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
        }
    }

    @Nested
    @DisplayName("응답 구조")
    class ApiResponseStructure {

        @Test
        @WithMockUser(roles = {"ADMIN", "MASTER"})
        @DisplayName("감사 로그 목록 성공 응답은 ApiResponse 구조를 따른다")
        void auditLogListSuccessResponseFollowsApiResponseShape() throws Exception {
            given(auditLogService.getAuditLogs(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                anyInt(),
                anyInt()
            )).willReturn(new PageImpl<>(List.of(createAuditLog(401L))));

            mockMvc.perform(
                    get("/api/v1/admin/audit-logs")
                        .param("page", "1")
                        .param("size", "20")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.content[0].auditLogId").value(401))
                .andExpect(jsonPath("$.data.content[0].logType").value("ADMIN_ACTIVITY"))
                .andExpect(jsonPath("$.data.content[0].severity").value("INFO"));
        }
    }

    private AuditLog createAuditLog(Long auditLogId) {
        try {
            var constructor = AuditLog.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            AuditLog auditLog = constructor.newInstance();
            ReflectionTestUtils.setField(auditLog, "auditLogId", auditLogId);
            ReflectionTestUtils.setField(auditLog, "adminId", 1L);
            ReflectionTestUtils.setField(auditLog, "logType", AuditLogType.ADMIN_ACTIVITY);
            ReflectionTestUtils.setField(auditLog, "action", "READ_AUDIT_LOG");
            ReflectionTestUtils.setField(auditLog, "targetType", "AUDIT_LOG");
            ReflectionTestUtils.setField(auditLog, "targetId", String.valueOf(auditLogId));
            ReflectionTestUtils.setField(auditLog, "ipAddress", "10.0.0.1");
            ReflectionTestUtils.setField(auditLog, "severity", AuditLogSeverity.INFO);
            ReflectionTestUtils.setField(auditLog, "detail", "audit log viewed");
            ReflectionTestUtils.setField(auditLog, "createdAt", ZonedDateTime.parse("2026-06-15T10:00:00Z"));
            return auditLog;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
