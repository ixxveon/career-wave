package kr.co.carrer.admin.cs.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.service.AdminFaqService;
import kr.co.carrer.admin.cs.service.AdminInquiryService;
import kr.co.carrer.admin.cs.service.AdminNoticeService;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
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

import org.junit.jupiter.api.BeforeEach;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AdminNoticeController.class, AdminFaqController.class, AdminInquiryController.class})
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class, SecurityMockConfig.class})
class AdminCsControllerAuthTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminNoticeService adminNoticeService;

    @MockBean
    private AdminFaqService adminFaqService;

    @MockBean
    private AdminInquiryService adminInquiryService;

    @MockBean
    private AccountStatusPort accountStatusPort;

    private static final ZonedDateTime NOW = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));

    @BeforeEach
    void setUp() {
        given(accountStatusPort.supports(AccountType.ADMIN)).willReturn(true);
        willDoNothing().given(accountStatusPort).validateActive(anyString());
    }

    private AuthPrincipal adminPrincipal() {
        return new AuthPrincipal("1", AccountType.ADMIN, "ADMIN", "CS");
    }

    @Nested
    @DisplayName("공지사항 등록 POST /api/v1/admin/notices")
    class CreateNotice {

        @Test
        @DisplayName("인증된 관리자는 201을 반환한다")
        void authenticated_admin_returns_201() throws Exception {
            NoticeDTO.ResponseResult response = new NoticeDTO.ResponseResult(1L, NOW);
            given(adminNoticeService.createNotice(any(), anyLong())).willReturn(response);

            NoticeDTO.RequestCreate dto = new NoticeDTO.RequestCreate(
                NoticeCategory.NOTICE, "공지 제목", "공지 내용", true
            );

            mockMvc.perform(post("/api/v1/admin/notices")
                    .with(user(adminPrincipal()))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.noticeId").value(1));
        }

        @Test
        @DisplayName("미인증 요청은 401을 반환한다")
        void unauthenticated_returns_401() throws Exception {
            NoticeDTO.RequestCreate dto = new NoticeDTO.RequestCreate(
                NoticeCategory.NOTICE, "공지 제목", "공지 내용", true
            );

            mockMvc.perform(post("/api/v1/admin/notices")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("FAQ 등록 POST /api/v1/admin/faqs")
    class CreateFaq {

        @Test
        @DisplayName("인증된 관리자는 201을 반환한다")
        void authenticated_admin_returns_201() throws Exception {
            FaqDTO.ResponseResult response = new FaqDTO.ResponseResult(1L, NOW);
            given(adminFaqService.createFaq(any(), anyLong())).willReturn(response);

            FaqDTO.RequestCreate dto = new FaqDTO.RequestCreate(
                FaqCategory.SERVICE, "자주 묻는 질문", "답변 내용"
            );

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .with(user(adminPrincipal()))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.faqId").value(1));
        }

        @Test
        @DisplayName("미인증 요청은 401을 반환한다")
        void unauthenticated_returns_401() throws Exception {
            FaqDTO.RequestCreate dto = new FaqDTO.RequestCreate(
                FaqCategory.SERVICE, "자주 묻는 질문", "답변 내용"
            );

            mockMvc.perform(post("/api/v1/admin/faqs")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("문의 답변 저장 PUT /api/v1/admin/inquiries/{id}/reply")
    class SaveReply {

        @Test
        @DisplayName("인증된 관리자는 200을 반환한다")
        void authenticated_admin_returns_200() throws Exception {
            InquiryDTO.ResponseReply response = new InquiryDTO.ResponseReply(
                1L, InquiryStatus.IN_PROGRESS, NOW
            );
            given(adminInquiryService.saveReply(anyLong(), anyString(), anyLong()))
                .willReturn(response);

            InquiryDTO.RequestReply dto = new InquiryDTO.RequestReply("답변 내용입니다");

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .with(user(adminPrincipal()))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.inquiryId").value(1))
                .andExpect(jsonPath("$.data.inquiryStatus").value("IN_PROGRESS"));
        }

        @Test
        @DisplayName("미인증 요청은 401을 반환한다")
        void unauthenticated_returns_401() throws Exception {
            InquiryDTO.RequestReply dto = new InquiryDTO.RequestReply("답변 내용입니다");

            mockMvc.perform(put("/api/v1/admin/inquiries/1/reply")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
        }
    }
}
