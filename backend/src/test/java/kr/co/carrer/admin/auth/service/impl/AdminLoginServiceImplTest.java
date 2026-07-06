package kr.co.carrer.admin.auth.service.impl;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.dto.AdminLoginDto;
import kr.co.carrer.admin.auth.type.AdminRole;
import kr.co.carrer.admin.auth.type.AdminStatus;
import kr.co.carrer.admin.auth.service.AdminLoginService;
import io.jsonwebtoken.Claims;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.store.LoginAttemptStore;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminLoginServiceImplTest {

    @Mock AdminRepository adminRepository;
    @Mock HttpServletResponse httpResponse;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock TokenBlacklistStore tokenBlacklistStore;
    @Mock LoginAttemptStore loginAttemptStore;

    private AdminLoginService service;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(10800000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);
        service = new AdminLoginServiceImpl(adminRepository, encoder, provider, props, refreshTokenStore, tokenBlacklistStore, loginAttemptStore);
        // 잠금 카운트 테스트가 아닌 경우 MAX 미달로 설정
        lenient().when(loginAttemptStore.increment(any(), anyString())).thenReturn(1L);
        lenient().when(loginAttemptStore.getMaxAttempts()).thenReturn(5);
    }

    private Admin createAdmin(AdminStatus status) throws Exception {
        Admin a = createAdminInstance();
        setField(a, "adminId", 1L);
        setField(a, "loginId", "admin@test.com");
        setField(a, "passwordHash", encoder.encode("adminpw123"));
        setField(a, "name", "관리자");
        setField(a, "adminRole", AdminRole.MASTER);
        setField(a, "status", status);
        return a;
    }

    private Admin createAdminInstance() throws Exception {
        java.lang.reflect.Constructor<Admin> ctor = Admin.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        return ctor.newInstance();
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

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");
        AdminLoginDto.Response result = service.login(req, httpResponse, "127.0.0.1");

        assertThat(result.getAccessToken()).isNotBlank();
        assertThat(result.getAdminInfo().getRole()).isEqualTo("MASTER");
        assertThat(result.getAdminInfo().getId()).isEqualTo(1L);
    }

    @Test
    void 존재하지_않는_loginId_AUTH_INVALID_CREDENTIALS() {
        when(adminRepository.findByLoginId(anyString())).thenReturn(Optional.empty());
        AdminLoginDto.Request req = new AdminLoginDto.Request("wrong@test.com", "pw");

        assertThatThrownBy(() -> service.login(req, httpResponse, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void 비밀번호_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));
        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "wrongpw");

        assertThatThrownBy(() -> service.login(req, httpResponse, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void LOCKED_관리자_AUTH_ACCOUNT_LOCKED() throws Exception {
        Admin admin = createAdmin(AdminStatus.LOCKED);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));
        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");

        assertThatThrownBy(() -> service.login(req, httpResponse, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_ACCOUNT_LOCKED);
    }

    @Test
    void 비밀번호_5회_실패_시_LOCKED_처리() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));
        when(loginAttemptStore.increment(any(), anyString())).thenReturn(5L);

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "wrongpw");
        assertThatThrownBy(() -> service.login(req, httpResponse, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_ACCOUNT_LOCKED);

        assertThat(admin.getStatus()).isEqualTo(AdminStatus.LOCKED);
        verify(loginAttemptStore).clear(AccountType.ADMIN, "admin@test.com");
    }

    @Test
    void 로그인_성공_시_실패_카운터_초기화() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");
        service.login(req, httpResponse, "127.0.0.1");

        verify(loginAttemptStore).clear(AccountType.ADMIN, "admin@test.com");
    }

    @Test
    void ADMIN_단일세션_신규_로그인_시_기존_세션_jti_blacklist_등록() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        String existingSessionId = "existing-session";
        String existingJti = "existing-jti";
        when(refreshTokenStore.getAllSessionIds(AccountType.ADMIN, "1"))
                .thenReturn(List.of(existingSessionId));
        when(refreshTokenStore.getAndDeleteAccessJti(AccountType.ADMIN, "1", existingSessionId))
                .thenReturn(existingJti);

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");
        service.login(req, httpResponse, "127.0.0.1");

        verify(tokenBlacklistStore).add(eq(existingJti), any());
        verify(refreshTokenStore).deleteAll(AccountType.ADMIN, "1");
    }

    @Test
    void admin_logout_후_access_token_blacklist_등록() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");
        AdminLoginDto.Response loginResult = service.login(req, httpResponse, "127.0.0.1");

        String accessToken = loginResult.getAccessToken();
        service.logout(null, accessToken);

        verify(tokenBlacklistStore, atLeastOnce()).add(anyString(), any());
    }

    @Test
    void 발급된_JWT에_adminRole_claim_포함() throws Exception {
        Admin admin = createAdmin(AdminStatus.ACTIVE);
        when(adminRepository.findByLoginId("admin@test.com")).thenReturn(Optional.of(admin));

        AdminLoginDto.Request req = new AdminLoginDto.Request("admin@test.com", "adminpw123");
        AdminLoginDto.Response result = service.login(req, httpResponse, "127.0.0.1");

        assertThat(result.getAdminInfo().getRole()).isEqualTo(AdminRole.MASTER.name());

        JwtProperties props = new JwtProperties();
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(10800000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);

        Claims claims = provider.parse(result.getAccessToken(), AccountType.ADMIN);
        assertThat(claims.get("adminRole", String.class)).isEqualTo(AdminRole.MASTER.name());
        assertThat(claims.get("roleType", String.class)).isEqualTo("ADMIN");
        assertThat(claims.getSubject()).isEqualTo("1");
    }
}
