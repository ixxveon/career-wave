package kr.co.carrer.admin.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.admin.auth.dto.AdminLoginRequest;
import kr.co.carrer.admin.auth.dto.AdminLoginResponse;
import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.type.AdminRole;
import kr.co.carrer.admin.auth.type.AdminStatus;
import io.jsonwebtoken.Claims;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminLoginServiceTest {

    @Mock AdminRepository adminRepository;
    @Mock HttpServletResponse httpResponse;

    private AdminLoginService service;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);
        service = new AdminLoginService(adminRepository, encoder, provider, props);
    }

    private Admin createAdmin(AdminStatus status) throws Exception {
        Admin a = new Admin();
        setField(a, "adminId", 1L);
        setField(a, "loginId", "admin@test.com");
        setField(a, "passwordHash", encoder.encode("adminpw123"));
        setField(a, "name", "관리자");
        setField(a, "adminRole", AdminRole.MASTER);
        setField(a, "status", status);
        return a;
    }

    private void setField(Object obj, String fieldName, Object value) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(obj, value);
    }

    @Test
    void 정상_로그인_accessToken_및_adminInfo_반환() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        AdminLoginRequest req = new AdminLoginRequest("admin@test.com", "adminpw123");
        AdminLoginResponse result = service.login(req, httpResponse);

        assertThat(result.accessToken()).isNotBlank();
        assertThat(result.adminInfo().role()).isEqualTo("MASTER");
        assertThat(result.adminInfo().id()).isEqualTo(1L);
    }

    @Test
    void 존재하지_않는_loginId_AUTH_INVALID_CREDENTIALS() {
        when(adminRepository.findByLoginId(anyString())).thenReturn(Optional.empty());
        AdminLoginRequest req = new AdminLoginRequest("wrong@test.com", "pw");

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void 비밀번호_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));
        AdminLoginRequest req = new AdminLoginRequest("admin@test.com", "wrongpw");

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void LOCKED_관리자_AUTH_ACCOUNT_LOCKED() throws Exception {
        Admin admin = createAdmin(AdminStatus.LOCKED);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));
        AdminLoginRequest req = new AdminLoginRequest("admin@test.com", "adminpw123");

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_ACCOUNT_LOCKED);
    }

    @Test
    void 발급된_JWT에_adminRole_claim_포함() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        AdminLoginRequest req = new AdminLoginRequest("admin@test.com", "adminpw123");
        AdminLoginResponse result = service.login(req, httpResponse);

        assertThat(result.adminInfo().role()).isEqualTo(AdminRole.MASTER.name());

        // JWT를 직접 파싱해 adminRole claim 검증
        JwtProperties props = new JwtProperties();
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);

        Claims claims = provider.parse(result.accessToken(), AccountType.ADMIN);
        assertThat(claims.get("adminRole", String.class)).isEqualTo(AdminRole.MASTER.name());
        assertThat(claims.get("roleType", String.class)).isEqualTo("ROLE_ADMIN");
        assertThat(claims.getSubject()).isEqualTo("1");
    }
}
