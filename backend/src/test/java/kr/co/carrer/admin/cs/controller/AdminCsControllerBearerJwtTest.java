package kr.co.carrer.admin.cs.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import kr.co.carrer.admin.auth.filter.AdminAccountStatusPort;
import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.service.AdminCsService;
import kr.co.carrer.admin.cs.service.AdminFaqService;
import kr.co.carrer.admin.cs.service.AdminInquiryService;
import kr.co.carrer.admin.cs.service.AdminNoticeService;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import kr.co.carrer.user.member.filter.UserAccountStatusPort;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mockito;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AdminCsController.class, AdminNoticeController.class, AdminFaqController.class, AdminInquiryController.class})
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class, SecurityMockConfig.class})
class AdminCsControllerBearerJwtTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminCsService adminCsService;

    @MockBean
    private AdminNoticeService adminNoticeService;

    @MockBean
    private AdminFaqService adminFaqService;

    @MockBean
    private AdminInquiryService adminInquiryService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private AdminAccountStatusPort adminAccountStatusPort;

    @MockBean
    private UserAccountStatusPort userAccountStatusPort;

    private static final ZonedDateTime NOW = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));

    @BeforeEach
    void resetSecurityMocks() {
        Mockito.reset(jwtTokenProvider, tokenBlacklistStore);
    }

    private Claims stubAdminClaims(String adminRole) {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("1");
        when(claims.get("roleType", String.class)).thenReturn("ADMIN");
        when(claims.get("adminRole", String.class)).thenReturn(adminRole);
        when(claims.get("jti", String.class)).thenReturn("test-jti-" + adminRole.toLowerCase());
        return claims;
    }

    private void stubValidAdminJwt(String token, String adminRole) throws Exception {
        Claims claims = stubAdminClaims(adminRole);
        when(jwtTokenProvider.extractAccountType(token)).thenReturn(AccountType.ADMIN);
        when(jwtTokenProvider.validate(token, AccountType.ADMIN)).thenReturn(true);
        when(jwtTokenProvider.parse(token, AccountType.ADMIN)).thenReturn(claims);
        when(tokenBlacklistStore.isBlacklisted(eq("test-jti-" + adminRole.toLowerCase()), anyBoolean())).thenReturn(false);
        when(adminAccountStatusPort.supports(AccountType.ADMIN)).thenReturn(true);
    }

    private void stubValidUserJwt(String token) throws Exception {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("uuid-1234");
        when(claims.get("roleType", String.class)).thenReturn("USER");
        when(claims.get("adminRole", String.class)).thenReturn(null);
        when(claims.get("jti", String.class)).thenReturn("test-jti-user");

        when(jwtTokenProvider.extractAccountType(token)).thenReturn(AccountType.USER);
        when(jwtTokenProvider.validate(token, AccountType.USER)).thenReturn(true);
        when(jwtTokenProvider.parse(token, AccountType.USER)).thenReturn(claims);
        when(tokenBlacklistStore.isBlacklisted(eq("test-jti-user"), anyBoolean())).thenReturn(false);
        when(userAccountStatusPort.supports(AccountType.USER)).thenReturn(true);
    }

    @Nested
    @DisplayName("공지사항 등록 POST /api/v1/admin/notices")
    class CreateNotice {

        private NoticeDTO.RequestCreate dto;

        @BeforeEach
        void setUp() {
            dto = new NoticeDTO.RequestCreate(NoticeCategory.NOTICE, "공지 제목", "공지 내용", true);
        }

        @Test
        @DisplayName("CS role JWT로 요청하면 201을 반환한다")
        void cs_role_returns_201() throws Exception {
            stubValidAdminJwt("cs.access.token", "CS");
            when(adminNoticeService.createNotice(any(), anyLong()))
                .thenReturn(new NoticeDTO.ResponseResult(1L, NOW));

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer cs.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.noticeId").value(1));
        }

        @Test
        @DisplayName("MASTER role JWT로 요청하면 201을 반환한다")
        void master_role_returns_201() throws Exception {
            stubValidAdminJwt("master.access.token", "MASTER");
            when(adminNoticeService.createNotice(any(), anyLong()))
                .thenReturn(new NoticeDTO.ResponseResult(1L, NOW));

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer master.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("USER role JWT로 요청하면 403을 반환한다")
        void user_role_returns_403() throws Exception {
            stubValidUserJwt("user.access.token");

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer user.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(403))
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
        }

        @Test
        @DisplayName("토큰 없이 요청하면 401을 반환한다")
        void no_token_returns_401() throws Exception {
            mockMvc.perform(post("/api/v1/admin/notices")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("위조된 토큰으로 요청하면 401을 반환한다")
        void forged_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("fake.invalid.token"))
                .thenThrow(new JwtException("Malformed JWT"));

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer fake.invalid.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("만료된 토큰으로 요청하면 401을 반환한다")
        void expired_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("expired.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("expired.token", AccountType.ADMIN))
                .thenThrow(new JwtException("JWT expired"));

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer expired.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("블랙리스트(로그아웃) 토큰으로 요청하면 401을 반환한다")
        void blacklisted_token_returns_401() throws Exception {
            Claims claims = stubAdminClaims("CS");
            when(jwtTokenProvider.extractAccountType("blacklisted.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("blacklisted.token", AccountType.ADMIN)).thenReturn(true);
            when(jwtTokenProvider.parse("blacklisted.token", AccountType.ADMIN)).thenReturn(claims);
            when(tokenBlacklistStore.isBlacklisted(eq("test-jti-cs"), anyBoolean())).thenReturn(true);

            mockMvc.perform(post("/api/v1/admin/notices")
                    .header("Authorization", "Bearer blacklisted.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }
    }

    @Nested
    @DisplayName("FAQ 등록 POST /api/v1/admin/faqs")
    class CreateFaq {

        private FaqDTO.RequestCreate dto;

        @BeforeEach
        void setUp() {
            dto = new FaqDTO.RequestCreate(FaqCategory.SERVICE, "자주 묻는 질문", "답변 내용");
        }

        @Test
        @DisplayName("CS role JWT로 요청하면 201을 반환한다")
        void cs_role_returns_201() throws Exception {
            stubValidAdminJwt("cs.access.token", "CS");
            when(adminFaqService.createFaq(any(), anyLong()))
                .thenReturn(new FaqDTO.ResponseResult(1L, NOW));

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer cs.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.faqId").value(1));
        }

        @Test
        @DisplayName("MASTER role JWT로 요청하면 201을 반환한다")
        void master_role_returns_201() throws Exception {
            stubValidAdminJwt("master.access.token", "MASTER");
            when(adminFaqService.createFaq(any(), anyLong()))
                .thenReturn(new FaqDTO.ResponseResult(1L, NOW));

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer master.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("USER role JWT로 요청하면 403을 반환한다")
        void user_role_returns_403() throws Exception {
            stubValidUserJwt("user.access.token");

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer user.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(403))
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
        }

        @Test
        @DisplayName("토큰 없이 요청하면 401을 반환한다")
        void no_token_returns_401() throws Exception {
            mockMvc.perform(post("/api/v1/admin/faqs")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("위조된 토큰으로 요청하면 401을 반환한다")
        void forged_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("fake.invalid.token"))
                .thenThrow(new JwtException("Malformed JWT"));

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer fake.invalid.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("만료된 토큰으로 요청하면 401을 반환한다")
        void expired_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("expired.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("expired.token", AccountType.ADMIN))
                .thenThrow(new JwtException("JWT expired"));

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer expired.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("블랙리스트(로그아웃) 토큰으로 요청하면 401을 반환한다")
        void blacklisted_token_returns_401() throws Exception {
            Claims claims = stubAdminClaims("CS");
            when(jwtTokenProvider.extractAccountType("blacklisted.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("blacklisted.token", AccountType.ADMIN)).thenReturn(true);
            when(jwtTokenProvider.parse("blacklisted.token", AccountType.ADMIN)).thenReturn(claims);
            when(tokenBlacklistStore.isBlacklisted(eq("test-jti-cs"), anyBoolean())).thenReturn(true);

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .header("Authorization", "Bearer blacklisted.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }
    }

    @Nested
    @DisplayName("문의 답변 저장 PUT /api/v1/admin/inquiries/{id}/reply")
    class SaveReply {

        private InquiryDTO.RequestReply dto;

        @BeforeEach
        void setUp() {
            dto = new InquiryDTO.RequestReply("답변 내용입니다");
        }

        @Test
        @DisplayName("CS role JWT로 요청하면 200을 반환한다")
        void cs_role_returns_200() throws Exception {
            stubValidAdminJwt("cs.access.token", "CS");
            when(adminInquiryService.saveReply(anyLong(), anyString(), anyLong()))
                .thenReturn(new InquiryDTO.ResponseReply(1L, InquiryStatus.IN_PROGRESS, NOW));

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer cs.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.inquiryId").value(1))
                .andExpect(jsonPath("$.data.inquiryStatus").value("IN_PROGRESS"));
        }

        @Test
        @DisplayName("MASTER role JWT로 요청하면 200을 반환한다")
        void master_role_returns_200() throws Exception {
            stubValidAdminJwt("master.access.token", "MASTER");
            when(adminInquiryService.saveReply(anyLong(), anyString(), anyLong()))
                .thenReturn(new InquiryDTO.ResponseReply(1L, InquiryStatus.IN_PROGRESS, NOW));

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer master.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("USER role JWT로 요청하면 403을 반환한다")
        void user_role_returns_403() throws Exception {
            stubValidUserJwt("user.access.token");

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer user.access.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(403))
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
        }

        @Test
        @DisplayName("토큰 없이 요청하면 401을 반환한다")
        void no_token_returns_401() throws Exception {
            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("블랙리스트(로그아웃) 토큰으로 요청하면 401을 반환한다")
        void blacklisted_token_returns_401() throws Exception {
            Claims claims = stubAdminClaims("CS");
            when(jwtTokenProvider.extractAccountType("blacklisted.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("blacklisted.token", AccountType.ADMIN)).thenReturn(true);
            when(jwtTokenProvider.parse("blacklisted.token", AccountType.ADMIN)).thenReturn(claims);
            when(tokenBlacklistStore.isBlacklisted(eq("test-jti-cs"), anyBoolean())).thenReturn(true);

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer blacklisted.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("위조된 토큰으로 요청하면 401을 반환한다")
        void forged_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("fake.invalid.token"))
                .thenThrow(new JwtException("Malformed JWT"));

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer fake.invalid.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }

        @Test
        @DisplayName("만료된 토큰으로 요청하면 401을 반환한다")
        void expired_token_returns_401() throws Exception {
            when(jwtTokenProvider.extractAccountType("expired.token")).thenReturn(AccountType.ADMIN);
            when(jwtTokenProvider.validate("expired.token", AccountType.ADMIN))
                .thenThrow(new JwtException("JWT expired"));

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .header("Authorization", "Bearer expired.token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401))
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
        }
    }
}
