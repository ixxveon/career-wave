package kr.co.carrer.user.member.service;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;


import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.MemberRepository;
import kr.co.carrer.user.member.dto.MemberStatus;
import kr.co.carrer.user.member.dto.RoleType;
import kr.co.carrer.user.member.dto.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserLoginServiceTest {

    @Mock MemberRepository memberRepository;
    @Mock HttpServletResponse httpResponse;
    @Mock EntityManager entityManager;
    @Mock jakarta.persistence.Query nativeQuery;

    private UserLoginService service;
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
        service = new UserLoginServiceImplImpl(memberRepository, encoder, provider, props, entityManager);
    }

    private Member createMember(RoleType roleType, MemberStatus status) throws Exception {
        Member m = new Member();
        setField(m, "memberId", UUID.randomUUID());
        setField(m, "loginId", "user01");
        setField(m, "password", encoder.encode("password123"));
        setField(m, "name", "홍길동");
        setField(m, "roleType", roleType);
        setField(m, "memberStatus", status);
        setField(m, "subscriptionStatus", SubscriptionStatus.FREE);
        return m;
    }

    private void setField(Object obj, String fieldName, Object value) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(obj, value);
    }

    @Test
    void 정상_로그인_USER_accessToken_반환() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", RoleType.ROLE_USER);
        UserLoginDto.Response result = service.login(req, httpResponse);

        assertThat(result.accessToken()).isNotBlank();
        assertThat(result.member().memberType()).isEqualTo("USER");
    }

    @Test
    void 존재하지_않는_아이디_AUTH_INVALID_CREDENTIALS() {
        when(memberRepository.findByLoginId(anyString())).thenReturn(Optional.empty());
        UserLoginDto.Request req = new UserLoginDto.Request("wrong", "pw", RoleType.ROLE_USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void 비밀번호_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "wrongpw", RoleType.ROLE_USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void memberType_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", RoleType.ROLE_COMPANY);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void SUSPENDED_계정_AUTH_ACCOUNT_SUSPENDED() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.SUSPENDED);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", RoleType.ROLE_USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
    }

    @Test
    void BANNED_계정_AUTH_ACCOUNT_BANNED() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.BANNED);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", RoleType.ROLE_USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
    }

    @Test
    void WITHDRAWN_계정_AUTH_ACCOUNT_WITHDRAWN() throws Exception {
        Member member = createMember(RoleType.ROLE_USER, MemberStatus.WITHDRAWN);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", RoleType.ROLE_USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
    }
}
