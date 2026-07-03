package kr.co.carrer.user.member.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.service.UserRegisterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserRegisterController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
class UserRegisterControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean UserRegisterService userRegisterService;
    @MockBean JwtTokenProvider jwtTokenProvider;
    @MockBean TokenBlacklistStore tokenBlacklistStore;
    @MockBean IpAclPort ipAclPort;

    // ─── loginId 중복 확인 ────────────────────────────────────────────────────────

    @Test
    @DisplayName("사용 가능한 loginId 조회 시 200 + statusCode=200 + available=true를 반환한다")
    void checkLoginId_사용가능_200() throws Exception {
        when(userRegisterService.checkLoginId("newuser01"))
                .thenReturn(new UserRegisterDto.ResponseCheckLoginId(true));

        mockMvc.perform(get("/api/v1/user/members/login-id/check")
                        .param("loginId", "newuser01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.available").value(true));
    }

    @Test
    @DisplayName("LOGIN_ID_INVALID 시 success=false statusCode=400 code=LOGIN_ID_INVALID를 반환한다")
    void checkLoginId_형식오류_400() throws Exception {
        when(userRegisterService.checkLoginId(anyString()))
                .thenThrow(new kr.co.carrer.global.exception.CustomException(
                        kr.co.carrer.user.member.exception.UserAuthErrorCode.LOGIN_ID_INVALID));

        mockMvc.perform(get("/api/v1/user/members/login-id/check")
                        .param("loginId", "a!"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.code").value("LOGIN_ID_INVALID"));
    }

    // ─── 개인회원 가입 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("개인회원 가입 성공 시 HTTP 201 + statusCode=201 + roleType=USER를 반환한다")
    void registerUser_성공_201() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(userRegisterService.registerUser(any()))
                .thenReturn(UserRegisterDto.ResponsePersonalRegister.of(memberId));

        String body = """
                {"loginId":"newuser01","password":"Password1!","name":"홍길동",
                 "email":"user@example.com","phone":"01012345678",
                 "emailVerificationToken":"etoken","phoneVerificationToken":"ptoken",
                 "terms":{"service":true,"privacy":true,"marketing":false}}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.roleType").value("USER"));
    }

    @Test
    @DisplayName("이름이 한글 실명 형식이 아니면 HTTP 400 + name 필드 검증 메시지를 반환한다")
    void registerUser_이름형식오류_400() throws Exception {
        String body = """
                {"loginId":"newuser01","password":"Password1!","name":"sss",
                 "email":"user@example.com","phone":"01012345678",
                 "emailVerificationToken":"etoken","phoneVerificationToken":"ptoken",
                 "terms":{"service":true,"privacy":true,"marketing":false}}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.data.name").value("이름은 2~10자 한글로 입력해 주세요."));

        verify(userRegisterService, never()).registerUser(any());
    }

    // ─── 기업회원 가입 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("기업회원 가입 성공 시 HTTP 201 + statusCode=201 + companyApprovalStatus=PENDING_REVIEW를 반환한다")
    void registerCompany_성공_201() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        when(userRegisterService.registerCompany(any()))
                .thenReturn(new UserRegisterDto.ResponseCompanyRegister(
                        memberId, companyId,
                        kr.co.carrer.user.member.type.MemberStatus.ACTIVE, "PENDING_REVIEW"));

        String body = """
                {"loginId":"company01","password":"Password1!","managerName":"김담당",
                 "managerEmail":"hr@co.com","managerPhone":"01099998888",
                 "companyName":"테스트","businessNumber":"1234567890","ceoName":"대표",
                 "certificateNumber":"C001","postalCode":"12345",
                 "roadAddress":"서울시","companyType":"SME","isAgency":false,
                 "managerPhoneVerificationToken":"pt","managerEmailVerificationToken":"et",
                 "employmentCertificateFileId":"stub-file-id-123",
                 "terms":{"service":true,"privacy":true,"marketing":false,"companyVerification":true,"sms":true}}
                """;

        mockMvc.perform(post("/api/v1/user/members/register/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.companyApprovalStatus").value("PENDING_REVIEW"));
    }

    // ─── 사업자 번호 사전 확인 ──────────────────────────────────────────────────────

    @Test
    @DisplayName("정상 사업자 확인 시 200 + valid=true + CONTINUING을 반환한다")
    void checkBusinessNumber_정상사업자_200() throws Exception {
        when(userRegisterService.checkBusinessNumber("1234567890"))
                .thenReturn(new UserRegisterDto.ResponseCheckBusinessNumber(true, "CONTINUING"));

        mockMvc.perform(post("/api/v1/user/members/company/business-number/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessNumber\":\"1234567890\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").value("정상 영업 중인 사업자입니다."))
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.businessStatus").value("CONTINUING"));
    }

    @Test
    @DisplayName("휴업 사업자 확인 시 200 + valid=false + SUSPENDED를 반환한다")
    void checkBusinessNumber_휴업사업자_200() throws Exception {
        when(userRegisterService.checkBusinessNumber("9876543210"))
                .thenReturn(new UserRegisterDto.ResponseCheckBusinessNumber(false, "SUSPENDED"));

        mockMvc.perform(post("/api/v1/user/members/company/business-number/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessNumber\":\"9876543210\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(false))
                .andExpect(jsonPath("$.data.businessStatus").value("SUSPENDED"));
    }

    @Test
    @DisplayName("10자리 미만 사업자번호는 400을 반환한다")
    void checkBusinessNumber_형식오류_400() throws Exception {
        mockMvc.perform(post("/api/v1/user/members/company/business-number/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessNumber\":\"12345\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400))
                .andExpect(jsonPath("$.message").value("입력값 검증에 실패했습니다."))
                .andExpect(jsonPath("$.code").doesNotExist());
    }

    // ─── 재직증명서 업로드 ────────────────────────────────────────────────────────

    @Test
    @DisplayName("PDF 업로드 성공 시 200 + statusCode=200 + fileId를 반환한다")
    void uploadCertificate_성공_200() throws Exception {
        when(userRegisterService.uploadEmploymentCertificate(any()))
                .thenReturn(new UserRegisterDto.ResponseEmploymentCertificateUpload(
                        "stub-file-id", "cert.pdf", "application/pdf", 1024L, Instant.now()));

        MockMultipartFile pdfFile = new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", new byte[1024]);

        mockMvc.perform(multipart("/api/v1/user/members/company/employment-certificate")
                        .file(pdfFile))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.fileId").isNotEmpty());
    }
}
