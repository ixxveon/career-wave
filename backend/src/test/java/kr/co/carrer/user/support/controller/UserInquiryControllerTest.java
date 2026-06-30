package kr.co.carrer.user.support.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.service.UserInquiryService;
import kr.co.carrer.user.support.type.InquiryCategory;
import kr.co.carrer.user.support.type.InquiryStatus;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserInquiryController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class UserInquiryControllerTest {

    private static final String TEST_MEMBER_ID = UUID.randomUUID().toString();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserInquiryService userInquiryService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenBlacklistStore tokenBlacklistStore;

    @MockBean
    private IpAclPort ipAclPort;

    @MockBean
    private AccountStatusPort accountStatusPort;

    @BeforeEach
    void setUp() {
        given(accountStatusPort.supports(AccountType.USER)).willReturn(true);
        willDoNothing().given(accountStatusPort).validateActive(anyString());
    }

    private AuthPrincipal userPrincipal() {
        return new AuthPrincipal(TEST_MEMBER_ID, AccountType.USER, "USER", null);
    }

    @Nested
    @DisplayName("문의 목록 조회 GET /api/v1/user/inquiries")
    class GetMyInquiries {

        @Test
        @DisplayName("인증된 사용자는 200을 반환한다")
        void getMyInquiries_returns200() throws Exception {
            SupportDTO.InquiryList item = new SupportDTO.InquiryList(
                1L, InquiryCategory.SERVICE, "문의 제목", "내용 미리보기",
                null, InquiryStatus.PENDING,
                ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
            );
            given(userInquiryService.getMyInquiries(any(UUID.class), eq(null), eq(1), eq(20)))
                .willReturn(PaginationResponse.of(List.of(item), 1, 20, 1));

            mockMvc.perform(get("/api/v1/user/inquiries")
                    .with(user(userPrincipal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].inquiryId").value(1))
                .andExpect(jsonPath("$.data.items[0].inquiryStatus").value("PENDING"));
        }

        @Test
        @DisplayName("미인증 요청은 401을 반환한다")
        void getMyInquiries_unauthenticatedReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/user/inquiries"))
                .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("문의 접수 POST /api/v1/user/inquiries")
    class CreateInquiry {

        @Test
        @DisplayName("유효한 요청은 201을 반환한다")
        void createInquiry_returns201() throws Exception {
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "문의 제목", "열 자 이상의 문의 내용입니다"
            );
            SupportDTO.ResponseCreateInquiry response = new SupportDTO.ResponseCreateInquiry(1L, InquiryStatus.PENDING);
            given(userInquiryService.createInquiry(any(UUID.class), any()))
                .willReturn(response);

            mockMvc.perform(post("/api/v1/user/inquiries")
                    .with(user(userPrincipal()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.inquiryId").value(1))
                .andExpect(jsonPath("$.data.inquiryStatus").value("PENDING"));
        }

        @Test
        @DisplayName("미인증 요청은 401을 반환한다")
        void createInquiry_unauthenticatedReturns401() throws Exception {
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "문의 제목", "열 자 이상의 문의 내용입니다"
            );

            mockMvc.perform(post("/api/v1/user/inquiries")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("title이 공백이면 400을 반환한다")
        void createInquiry_blankTitleReturns400() throws Exception {
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "", "열 자 이상의 문의 내용입니다"
            );

            mockMvc.perform(post("/api/v1/user/inquiries")
                    .with(user(userPrincipal()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
        }
    }
}
